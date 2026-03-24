import { sqlite } from "@/server/db/client";

const selectQuestionSearchDocumentStatement = sqlite.prepare(`
  SELECT
    q.id AS questionId,
    q.question_text AS questionText,
    COALESCE(q.canonical_answer, '') AS canonicalAnswer,
    COALESCE((
      SELECT GROUP_CONCAT(t.name, ' ')
      FROM question_tags qt
      INNER JOIN tags t
        ON t.id = qt.tag_id
      WHERE qt.question_item_id = q.id
    ), '') AS tagText
  FROM question_items q
  WHERE q.id = ?
`);

const deleteQuestionSearchDocumentStatement = sqlite.prepare(`
  DELETE FROM question_search
  WHERE question_id = ?
`);

const insertQuestionSearchDocumentStatement = sqlite.prepare(`
  INSERT INTO question_search (
    question_id,
    question_text,
    canonical_answer,
    tag_text
  )
  VALUES (?, ?, ?, ?)
`);

const selectInterviewSearchDocumentStatement = sqlite.prepare(`
  SELECT
    i.id AS interviewId,
    COALESCE(i.company, '') AS company,
    COALESCE(i.role, '') AS role,
    COALESCE(i.round_info, '') AS roundInfo,
    COALESCE(i.summary, '') AS summary,
    COALESCE((
      SELECT GROUP_CONCAT(t.name, ' ')
      FROM interview_tags it
      INNER JOIN tags t
        ON t.id = it.tag_id
      WHERE it.interview_experience_id = i.id
    ), '') AS tagText,
    COALESCE(sd.title, '') AS sourceTitle,
    COALESCE(sd.raw_text, '') AS sourceRawText
  FROM interview_experiences i
  INNER JOIN source_documents sd
    ON sd.id = i.source_document_id
  WHERE i.id = ?
`);

const deleteInterviewSearchDocumentStatement = sqlite.prepare(`
  DELETE FROM interview_search
  WHERE interview_id = ?
`);

const insertInterviewSearchDocumentStatement = sqlite.prepare(`
  INSERT INTO interview_search (
    interview_id,
    company,
    role,
    round_info,
    summary,
    tag_text,
    source_title,
    source_raw_text
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

export const searchIndexRepository = {
  upsertQuestionDocument(questionId: string) {
    const searchDocument = selectQuestionSearchDocumentStatement.get(questionId) as
      | {
          questionId: string;
          questionText: string;
          canonicalAnswer: string;
          tagText: string;
        }
      | undefined;

    deleteQuestionSearchDocumentStatement.run(questionId);

    if (!searchDocument) {
      return;
    }

    insertQuestionSearchDocumentStatement.run(
      searchDocument.questionId,
      searchDocument.questionText,
      searchDocument.canonicalAnswer,
      searchDocument.tagText,
    );
  },

  upsertInterviewDocument(interviewId: string) {
    const searchDocument = selectInterviewSearchDocumentStatement.get(interviewId) as
      | {
          interviewId: string;
          company: string;
          role: string;
          roundInfo: string;
          summary: string;
          tagText: string;
          sourceTitle: string;
          sourceRawText: string;
        }
      | undefined;

    deleteInterviewSearchDocumentStatement.run(interviewId);

    if (!searchDocument) {
      return;
    }

    insertInterviewSearchDocumentStatement.run(
      searchDocument.interviewId,
      searchDocument.company,
      searchDocument.role,
      searchDocument.roundInfo,
      searchDocument.summary,
      searchDocument.tagText,
      searchDocument.sourceTitle,
      searchDocument.sourceRawText,
    );
  },
};
