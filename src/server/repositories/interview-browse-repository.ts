import { sqlite } from "@/server/db/client";
import { normalizeTagName } from "@/server/repositories/normalization";
import {
  buildFtsPhraseQuery,
  buildLikePattern,
  parseJsonStringArray,
  shouldUseFtsQuery,
} from "@/server/repositories/search-helpers";

/**
 * [POS] 负责面经列表与详情的 SQLite 查询边界，并兼容新旧面经题模型。
 * [IN] 面经筛选条件、interview id。
 * [OUT] 返回面经列表、详情、面经原题和历史题库关联的最小读模型。
 *
 * @feature open-interview-interviews-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

type ListInterviewsInput = {
  query?: string;
  company?: string;
  tag?: string;
  page: number;
  pageSize: number;
};

type InterviewFacet = {
  name: string;
  count: number;
};

type InterviewQuestionRow = {
  id: string;
  sourceKind: "interview_question" | "legacy_question_link";
  questionText: string;
  sourceAnswer: string | null;
  category: string | null;
  sourceSnippet: string | null;
  tags: string[];
  promotedQuestions: Array<{
    questionItemId: string;
    questionText: string;
    category: string | null;
    tags: string[];
    linkType: "promoted_create" | "promoted_merge";
  }>;
};

function buildInterviewWhereClause(input: ListInterviewsInput) {
  const conditions = [`i.status = 'active'`, `sd.status = 'active'`];
  const params: unknown[] = [];

  if (input.query) {
    const likePattern = buildLikePattern(input.query);
    const searchConditions = [
      `COALESCE(i.company, '') LIKE ? ESCAPE '\\'`,
      `COALESCE(i.role, '') LIKE ? ESCAPE '\\'`,
      `COALESCE(i.round_info, '') LIKE ? ESCAPE '\\'`,
      `COALESCE(i.summary, '') LIKE ? ESCAPE '\\'`,
      `sd.title LIKE ? ESCAPE '\\'`,
      `sd.raw_text LIKE ? ESCAPE '\\'`,
      `EXISTS (
        SELECT 1
        FROM interview_tags search_it
        INNER JOIN tags search_t
          ON search_t.id = search_it.tag_id
        WHERE search_it.interview_experience_id = i.id
          AND search_t.name LIKE ? ESCAPE '\\'
      )`,
    ];
    const searchParams: unknown[] = [
      likePattern,
      likePattern,
      likePattern,
      likePattern,
      likePattern,
      likePattern,
      likePattern,
    ];

    if (shouldUseFtsQuery(input.query)) {
      searchConditions.unshift(`
        i.id IN (
          SELECT interview_id
          FROM interview_search
          WHERE interview_search MATCH ?
        )
      `);
      searchParams.unshift(buildFtsPhraseQuery(input.query));
    }

    conditions.push(`(${searchConditions.join(" OR ")})`);
    params.push(...searchParams);
  }

  if (input.company) {
    conditions.push(`i.company = ?`);
    params.push(input.company);
  }

  if (input.tag) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM interview_tags filter_it
        INNER JOIN tags filter_t
          ON filter_t.id = filter_it.tag_id
        WHERE filter_it.interview_experience_id = i.id
          AND filter_t.normalized_name = ?
      )
    `);
    params.push(normalizeTagName(input.tag));
  }

  return {
    sql: conditions.join(" AND "),
    params,
  };
}

function listInterviewQuestionRows(interviewId: string) {
  const questions = sqlite
    .prepare(
      `
        SELECT
          iq.id AS id,
          iq.question_text AS questionText,
          iq.source_answer AS sourceAnswer,
          iq.category AS category,
          iq.source_snippet AS sourceSnippet,
          COALESCE((
            SELECT json_group_array(name)
            FROM (
              SELECT t.name AS name
              FROM interview_question_tags iqt
              INNER JOIN tags t
                ON t.id = iqt.tag_id
              WHERE iqt.interview_question_id = iq.id
              ORDER BY t.name COLLATE NOCASE
            )
          ), '[]') AS tagsJson
        FROM interview_questions iq
        WHERE iq.interview_experience_id = ?
        ORDER BY
          CASE WHEN iq.source_order IS NULL THEN 1 ELSE 0 END,
          iq.source_order ASC,
          iq.updated_at DESC
      `,
    )
    .all(interviewId) as Array<{
    id: string;
    questionText: string;
    sourceAnswer: string | null;
    category: string | null;
    sourceSnippet: string | null;
    tagsJson: string;
  }>;

  if (questions.length === 0) {
    return [];
  }

  const promotedLinks = sqlite
    .prepare(
      `
        SELECT
          iql.interview_question_id AS interviewQuestionId,
          iql.link_type AS linkType,
          q.id AS questionItemId,
          q.question_text AS questionText,
          q.category AS category,
          COALESCE((
            SELECT json_group_array(name)
            FROM (
              SELECT t.name AS name
              FROM question_tags qt
              INNER JOIN tags t
                ON t.id = qt.tag_id
              WHERE qt.question_item_id = q.id
              ORDER BY t.name COLLATE NOCASE
            )
          ), '[]') AS tagsJson
        FROM interview_question_links iql
        INNER JOIN question_items q
          ON q.id = iql.question_item_id
        WHERE iql.interview_question_id IN (
          SELECT id
          FROM interview_questions
          WHERE interview_experience_id = ?
        )
          AND q.review_status = 'active'
        ORDER BY iql.created_at DESC
      `,
    )
    .all(interviewId) as Array<{
    interviewQuestionId: string;
    linkType: "promoted_create" | "promoted_merge";
    questionItemId: string;
    questionText: string;
    category: string | null;
    tagsJson: string;
  }>;
  const promotedLinkMap = new Map<
    string,
    InterviewQuestionRow["promotedQuestions"]
  >();

  for (const promotedLink of promotedLinks) {
    const current = promotedLinkMap.get(promotedLink.interviewQuestionId) ?? [];

    current.push({
      questionItemId: promotedLink.questionItemId,
      questionText: promotedLink.questionText,
      category: promotedLink.category,
      tags: parseJsonStringArray(promotedLink.tagsJson),
      linkType: promotedLink.linkType,
    });
    promotedLinkMap.set(promotedLink.interviewQuestionId, current);
  }

  return questions.map((question) => ({
    id: question.id,
    sourceKind: "interview_question" as const,
    questionText: question.questionText,
    sourceAnswer: question.sourceAnswer,
    category: question.category,
    sourceSnippet: question.sourceSnippet,
    tags: parseJsonStringArray(question.tagsJson),
    promotedQuestions: promotedLinkMap.get(question.id) ?? [],
  }));
}

function listLegacyInterviewQuestionRows(sourceDocumentId: string) {
  return sqlite
    .prepare(
      `
        SELECT
          q.id AS id,
          q.question_text AS questionText,
          q.category AS category,
          sqr.source_snippet AS sourceSnippet,
          COALESCE((
            SELECT json_group_array(name)
            FROM (
              SELECT t.name AS name
              FROM question_tags qt
              INNER JOIN tags t
                ON t.id = qt.tag_id
              WHERE qt.question_item_id = q.id
              ORDER BY t.name COLLATE NOCASE
            )
          ), '[]') AS tagsJson
        FROM source_question_refs sqr
        INNER JOIN question_items q
          ON q.id = sqr.question_item_id
        WHERE sqr.source_document_id = ?
          AND q.review_status = 'active'
        ORDER BY
          CASE WHEN sqr.source_order IS NULL THEN 1 ELSE 0 END,
          sqr.source_order ASC,
          q.updated_at DESC
      `,
    )
    .all(sourceDocumentId) as Array<{
    id: string;
    questionText: string;
    category: string | null;
    sourceSnippet: string | null;
    tagsJson: string;
  }>;
}

export const interviewBrowseRepository = {
  list(input: ListInterviewsInput) {
    const whereClause = buildInterviewWhereClause(input);
    const items = sqlite
      .prepare(
        `
          SELECT
            i.id AS id,
            i.source_document_id AS sourceDocumentId,
            sd.title AS sourceTitle,
            i.company AS company,
            i.role AS role,
            i.round_info AS roundInfo,
            i.summary AS summary,
            i.updated_at AS updatedAt,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM interview_questions iq
                WHERE iq.interview_experience_id = i.id
              ) THEN (
                SELECT COUNT(*)
                FROM interview_questions iq
                WHERE iq.interview_experience_id = i.id
              )
              ELSE (
                SELECT COUNT(*)
                FROM source_question_refs sqr
                WHERE sqr.source_document_id = i.source_document_id
              )
            END AS questionCount,
            COALESCE((
              SELECT json_group_array(name)
              FROM (
                SELECT t.name AS name
                FROM interview_tags it
                INNER JOIN tags t
                  ON t.id = it.tag_id
                WHERE it.interview_experience_id = i.id
                ORDER BY t.name COLLATE NOCASE
              )
            ), '[]') AS tagsJson
          FROM interview_experiences i
          INNER JOIN source_documents sd
            ON sd.id = i.source_document_id
          WHERE ${whereClause.sql}
          ORDER BY i.updated_at DESC, i.created_at DESC
          LIMIT ? OFFSET ?
        `,
      )
      .all(
        ...whereClause.params,
        input.pageSize,
        (input.page - 1) * input.pageSize,
      ) as Array<{
      id: string;
      sourceDocumentId: string;
      sourceTitle: string;
      company: string | null;
      role: string | null;
      roundInfo: string | null;
      summary: string | null;
      updatedAt: string;
      questionCount: number;
      tagsJson: string;
    }>;

    const total = Number(
      (
        sqlite
          .prepare(
            `
              SELECT COUNT(*) AS count
              FROM interview_experiences i
              INNER JOIN source_documents sd
                ON sd.id = i.source_document_id
              WHERE ${whereClause.sql}
            `,
          )
          .get(...whereClause.params) as { count: number } | undefined
      )?.count ?? 0,
    );

    return {
      items: items.map((item) => ({
        id: item.id,
        sourceDocumentId: item.sourceDocumentId,
        sourceTitle: item.sourceTitle,
        company: item.company,
        role: item.role,
        roundInfo: item.roundInfo,
        summary: item.summary,
        updatedAt: item.updatedAt,
        questionCount: item.questionCount,
        tags: parseJsonStringArray(item.tagsJson),
      })),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  },

  listFacets() {
    const companies = sqlite
      .prepare(
        `
          SELECT i.company AS name, COUNT(*) AS count
          FROM interview_experiences i
          INNER JOIN source_documents sd
            ON sd.id = i.source_document_id
          WHERE i.status = 'active'
            AND sd.status = 'active'
            AND i.company IS NOT NULL
          GROUP BY i.company
          ORDER BY count DESC, i.company COLLATE NOCASE ASC
        `,
      )
      .all() as InterviewFacet[];
    const tags = sqlite
      .prepare(
        `
          SELECT t.name AS name, COUNT(*) AS count
          FROM interview_tags it
          INNER JOIN tags t
            ON t.id = it.tag_id
          INNER JOIN interview_experiences i
            ON i.id = it.interview_experience_id
          INNER JOIN source_documents sd
            ON sd.id = i.source_document_id
          WHERE i.status = 'active'
            AND sd.status = 'active'
          GROUP BY t.id, t.name
          ORDER BY count DESC, t.name COLLATE NOCASE ASC
          LIMIT 40
        `,
      )
      .all() as InterviewFacet[];

    return {
      companies,
      tags,
    };
  },

  findById(interviewId: string) {
    const interview = sqlite
      .prepare(
        `
          SELECT
            i.id AS id,
            i.source_document_id AS sourceDocumentId,
            i.company AS company,
            i.role AS role,
            i.round_info AS roundInfo,
            i.summary AS summary,
            i.updated_at AS updatedAt,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM interview_questions iq
                WHERE iq.interview_experience_id = i.id
              ) THEN (
                SELECT COUNT(*)
                FROM interview_questions iq
                WHERE iq.interview_experience_id = i.id
              )
              ELSE (
                SELECT COUNT(*)
                FROM source_question_refs sqr
                WHERE sqr.source_document_id = i.source_document_id
              )
            END AS questionCount,
            COALESCE((
              SELECT json_group_array(name)
              FROM (
                SELECT t.name AS name
                FROM interview_tags it
                INNER JOIN tags t
                  ON t.id = it.tag_id
                WHERE it.interview_experience_id = i.id
                ORDER BY t.name COLLATE NOCASE
              )
            ), '[]') AS tagsJson,
            sd.id AS sourceId,
            sd.title AS sourceTitle,
            sd.kind AS sourceKind,
            sd.file_name AS fileName,
            sd.source_url AS sourceUrl,
            sd.raw_text AS rawText,
            sd.created_at AS sourceCreatedAt,
            sd.updated_at AS sourceUpdatedAt
          FROM interview_experiences i
          INNER JOIN source_documents sd
            ON sd.id = i.source_document_id
          WHERE i.id = ?
            AND i.status = 'active'
            AND sd.status = 'active'
          LIMIT 1
        `,
      )
      .get(interviewId) as
      | {
          id: string;
          sourceDocumentId: string;
          company: string | null;
          role: string | null;
          roundInfo: string | null;
          summary: string | null;
          updatedAt: string;
          questionCount: number;
          tagsJson: string;
          sourceId: string;
          sourceTitle: string;
          sourceKind:
            | "interview_experience"
            | "knowledge_note"
            | "resume"
            | "manual_input";
          fileName: string | null;
          sourceUrl: string | null;
          rawText: string;
          sourceCreatedAt: string;
          sourceUpdatedAt: string;
        }
      | undefined;

    if (!interview) {
      return undefined;
    }

    const interviewQuestions = listInterviewQuestionRows(interview.id);
    const questions =
      interviewQuestions.length > 0
        ? interviewQuestions
        : listLegacyInterviewQuestionRows(interview.sourceDocumentId).map((question) => ({
            id: question.id,
            sourceKind: "legacy_question_link" as const,
            questionText: question.questionText,
            sourceAnswer: null,
            category: question.category,
            sourceSnippet: question.sourceSnippet,
            tags: parseJsonStringArray(question.tagsJson),
            promotedQuestions: [],
          }));

    return {
      id: interview.id,
      sourceDocumentId: interview.sourceDocumentId,
      company: interview.company,
      role: interview.role,
      roundInfo: interview.roundInfo,
      summary: interview.summary,
      updatedAt: interview.updatedAt,
      questionCount: interview.questionCount,
      tags: parseJsonStringArray(interview.tagsJson),
      questions,
      sourceDocument: {
        id: interview.sourceId,
        title: interview.sourceTitle,
        kind: interview.sourceKind,
        fileName: interview.fileName,
        sourceUrl: interview.sourceUrl,
        rawText: interview.rawText,
        createdAt: interview.sourceCreatedAt,
        updatedAt: interview.sourceUpdatedAt,
      },
    };
  },
};
