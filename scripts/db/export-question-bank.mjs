import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const rootDir = path.resolve(import.meta.dirname, "..", "..");

function resolveDatabasePath() {
  const configuredPath =
    process.env.OPEN_INTERVIEW_DB_PATH ?? process.env.DATABASE_URL;

  if (configuredPath && configuredPath.trim().length > 0) {
    if (configuredPath.startsWith("file:")) {
      return fileURLToPath(configuredPath);
    }

    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(rootDir, configuredPath);
  }

  return path.join(rootDir, "storage", "open-interview.sqlite");
}

function resolveExportDirectory() {
  if (
    process.env.OPEN_INTERVIEW_EXPORT_DIR &&
    process.env.OPEN_INTERVIEW_EXPORT_DIR.trim().length > 0
  ) {
    return path.isAbsolute(process.env.OPEN_INTERVIEW_EXPORT_DIR)
      ? process.env.OPEN_INTERVIEW_EXPORT_DIR
      : path.resolve(rootDir, process.env.OPEN_INTERVIEW_EXPORT_DIR);
  }

  return path.join(rootDir, "storage", "exports");
}

function toTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

const databasePath = resolveDatabasePath();

if (!fs.existsSync(databasePath)) {
  throw new Error(`SQLite database was not found at ${databasePath}`);
}

const exportDirectory = resolveExportDirectory();
fs.mkdirSync(exportDirectory, { recursive: true });

const exportPath = path.join(
  exportDirectory,
  `question-bank-${toTimestamp()}.json`,
);

const sqlite = new Database(databasePath, {
  fileMustExist: true,
  readonly: true,
});

const listQuestions = sqlite.prepare(`
  SELECT
    q.id AS id,
    q.question_text AS questionText,
    q.canonical_answer AS canonicalAnswer,
    q.category AS category,
    q.difficulty AS difficulty,
    q.source_count AS sourceCount,
    q.review_status AS reviewStatus,
    q.created_at AS createdAt,
    q.updated_at AS updatedAt
  FROM question_items q
  WHERE q.review_status = 'active'
  ORDER BY q.updated_at DESC, q.source_count DESC, q.question_text COLLATE NOCASE ASC
`);
const listTags = sqlite.prepare(`
  SELECT t.name AS name
  FROM question_tags qt
  INNER JOIN tags t
    ON t.id = qt.tag_id
  WHERE qt.question_item_id = ?
  ORDER BY t.name COLLATE NOCASE ASC
`);
const listSupplementalAnswers = sqlite.prepare(`
  SELECT
    av.id AS id,
    av.variant_type AS variantType,
    av.content AS content,
    av.author_type AS authorType,
    av.created_at AS createdAt,
    av.updated_at AS updatedAt
  FROM answer_variants av
  WHERE av.question_item_id = ?
    AND av.status = 'active'
    AND av.variant_type <> 'canonical'
  ORDER BY av.updated_at DESC, av.created_at DESC
`);
const listSources = sqlite.prepare(`
  SELECT
    sqr.id AS sourceRefId,
    sqr.source_document_id AS sourceDocumentId,
    sqr.source_snippet AS sourceSnippet,
    sqr.source_order AS sourceOrder,
    sd.title AS sourceTitle,
    sd.kind AS sourceKind,
    sd.source_url AS sourceUrl,
    ie.id AS interviewExperienceId,
    ie.company AS company,
    ie.role AS role,
    ie.round_info AS roundInfo
  FROM source_question_refs sqr
  INNER JOIN source_documents sd
    ON sd.id = sqr.source_document_id
  LEFT JOIN interview_experiences ie
    ON ie.source_document_id = sd.id
  WHERE sqr.question_item_id = ?
  ORDER BY
    CASE WHEN sqr.source_order IS NULL THEN 1 ELSE 0 END,
    sqr.source_order ASC,
    sqr.created_at ASC
`);
const listLinkedInterviewQuestions = sqlite.prepare(`
  SELECT
    iql.interview_question_id AS interviewQuestionId,
    iql.link_type AS linkType,
    iq.question_text AS questionText,
    iq.source_answer AS sourceAnswer,
    ie.id AS interviewExperienceId,
    ie.company AS company,
    ie.role AS role,
    ie.round_info AS roundInfo
  FROM interview_question_links iql
  INNER JOIN interview_questions iq
    ON iq.id = iql.interview_question_id
  INNER JOIN interview_experiences ie
    ON ie.id = iq.interview_experience_id
  WHERE iql.question_item_id = ?
  ORDER BY iql.created_at ASC
`);

const items = listQuestions.all().map((question) => ({
  id: question.id,
  question_text: question.questionText,
  canonical_answer: question.canonicalAnswer,
  category: question.category,
  difficulty: question.difficulty,
  review_status: question.reviewStatus,
  source_count: question.sourceCount,
  tags: listTags.all(question.id).map((tag) => tag.name),
  supplemental_answers: listSupplementalAnswers.all(question.id).map((variant) => ({
    id: variant.id,
    variant_type: variant.variantType,
    content: variant.content,
    author_type: variant.authorType,
    created_at: variant.createdAt,
    updated_at: variant.updatedAt,
  })),
  sources: listSources.all(question.id).map((source) => ({
    source_ref_id: source.sourceRefId,
    source_document_id: source.sourceDocumentId,
    title: source.sourceTitle,
    kind: source.sourceKind,
    source_url: source.sourceUrl,
    source_snippet: source.sourceSnippet,
    source_order: source.sourceOrder,
    interview_experience: source.interviewExperienceId
      ? {
          id: source.interviewExperienceId,
          company: source.company,
          role: source.role,
          round_info: source.roundInfo,
        }
      : null,
  })),
  linked_interview_questions: listLinkedInterviewQuestions.all(question.id).map((link) => ({
    interview_question_id: link.interviewQuestionId,
    link_type: link.linkType,
    question_text: link.questionText,
    source_answer: link.sourceAnswer,
    interview_experience: {
      id: link.interviewExperienceId,
      company: link.company,
      role: link.role,
      round_info: link.roundInfo,
    },
  })),
  created_at: question.createdAt,
  updated_at: question.updatedAt,
}));

sqlite.close();

const payload = {
  exported_at: new Date().toISOString(),
  source_database_path: databasePath,
  question_count: items.length,
  items,
};

fs.writeFileSync(exportPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

process.stdout.write(`Question bank exported to ${exportPath}\n`);
