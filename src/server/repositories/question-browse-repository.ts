import { normalizeTagName } from "@/server/repositories/normalization";
import {
  buildFtsPhraseQuery,
  buildLikePattern,
  parseJsonStringArray,
  shouldUseFtsQuery,
} from "@/server/repositories/search-helpers";
import { sqlite } from "@/server/db/client";

/**
 * [POS] 负责题库浏览、详情、相邻跳转与练习题池读取的 SQLite 查询边界。
 * [IN] 题库筛选条件、question id、练习模式读取请求。
 * [OUT] 返回题库列表、详情、facets、相邻题与练习所需的最小题目快照。
 *
 * @feature open-interview-questions-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

type QuestionDifficulty = "easy" | "medium" | "hard";
type QuestionSort = "updated_at" | "source_count";

type ListQuestionsInput = {
  query?: string;
  category?: string;
  tag?: string;
  difficulty?: QuestionDifficulty;
  sort: QuestionSort;
  page: number;
  pageSize: number;
};

type QuestionFacet = {
  name: string;
  count: number;
};

type AdjacentQuestion = {
  id: string;
  questionText: string;
  page: number;
};

type QuestionDetailRecord = {
  id: string;
  questionText: string;
  canonicalAnswer: string | null;
  category: string | null;
  difficulty: QuestionDifficulty | null;
  sourceCount: number;
  reviewStatus: "draft" | "active" | "archived";
  updatedAt: string;
  tagsJson: string;
};

type PracticePoolRecord = {
  id: string;
  questionText: string;
  canonicalAnswer: string | null;
  category: string | null;
  difficulty: QuestionDifficulty | null;
  tagsJson: string;
};

function buildQuestionWhereClause(input: ListQuestionsInput) {
  const conditions = [`q.review_status = 'active'`];
  const params: unknown[] = [];

  if (input.query) {
    const likePattern = buildLikePattern(input.query);
    const searchConditions = [
      `q.question_text LIKE ? ESCAPE '\\'`,
      `COALESCE(q.canonical_answer, '') LIKE ? ESCAPE '\\'`,
      `COALESCE(q.category, '') LIKE ? ESCAPE '\\'`,
      `EXISTS (
        SELECT 1
        FROM question_tags search_qt
        INNER JOIN tags search_t
          ON search_t.id = search_qt.tag_id
        WHERE search_qt.question_item_id = q.id
          AND search_t.name LIKE ? ESCAPE '\\'
      )`,
    ];
    const searchParams: unknown[] = [
      likePattern,
      likePattern,
      likePattern,
      likePattern,
    ];

    if (shouldUseFtsQuery(input.query)) {
      searchConditions.unshift(`
        q.id IN (
          SELECT question_id
          FROM question_search
          WHERE question_search MATCH ?
        )
      `);
      searchParams.unshift(buildFtsPhraseQuery(input.query));
    }

    conditions.push(`(${searchConditions.join(" OR ")})`);
    params.push(...searchParams);
  }

  if (input.category) {
    conditions.push(`q.category = ?`);
    params.push(input.category);
  }

  if (input.tag) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM question_tags filter_qt
        INNER JOIN tags filter_t
          ON filter_t.id = filter_qt.tag_id
        WHERE filter_qt.question_item_id = q.id
          AND filter_t.normalized_name = ?
      )
    `);
    params.push(normalizeTagName(input.tag));
  }

  if (input.difficulty) {
    conditions.push(`q.difficulty = ?`);
    params.push(input.difficulty);
  }

  return {
    sql: conditions.join(" AND "),
    params,
  };
}

function parseQuestionListItem(row: {
  id: string;
  questionText: string;
  category: string | null;
  difficulty: QuestionDifficulty | null;
  sourceCount: number;
  updatedAt: string;
  tagsJson: string;
}) {
  return {
    id: row.id,
    questionText: row.questionText,
    category: row.category,
    difficulty: row.difficulty,
    sourceCount: row.sourceCount,
    updatedAt: row.updatedAt,
    tags: parseJsonStringArray(row.tagsJson),
  };
}


export const questionBrowseRepository = {
  listPracticePool() {
    const rows = sqlite
      .prepare(
        `
          SELECT
            q.id AS id,
            q.question_text AS questionText,
            q.canonical_answer AS canonicalAnswer,
            q.category AS category,
            q.difficulty AS difficulty,
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
          FROM question_items q
          WHERE q.review_status = 'active'
          ORDER BY q.updated_at DESC, q.source_count DESC, q.question_text COLLATE NOCASE ASC
        `,
      )
      .all() as PracticePoolRecord[];

    return rows.map((row) => ({
      id: row.id,
      questionText: row.questionText,
      canonicalAnswer: row.canonicalAnswer,
      category: row.category,
      difficulty: row.difficulty,
      tags: parseJsonStringArray(row.tagsJson),
    }));
  },

  list(input: ListQuestionsInput) {
    const whereClause = buildQuestionWhereClause(input);
    const orderByClause =
      input.sort === "source_count"
        ? "q.source_count DESC, q.updated_at DESC, q.question_text COLLATE NOCASE ASC"
        : "q.updated_at DESC, q.source_count DESC, q.question_text COLLATE NOCASE ASC";

    const items = sqlite
      .prepare(
        `
          SELECT
            q.id AS id,
            q.question_text AS questionText,
            q.category AS category,
            q.difficulty AS difficulty,
            q.source_count AS sourceCount,
            q.updated_at AS updatedAt,
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
          FROM question_items q
          WHERE ${whereClause.sql}
          ORDER BY ${orderByClause}
          LIMIT ? OFFSET ?
        `,
      )
      .all(
        ...whereClause.params,
        input.pageSize,
        (input.page - 1) * input.pageSize,
      ) as Array<{
      id: string;
      questionText: string;
      category: string | null;
      difficulty: QuestionDifficulty | null;
      sourceCount: number;
      updatedAt: string;
      tagsJson: string;
    }>;

    const total = Number(
      (
        sqlite
          .prepare(
            `
              SELECT COUNT(*) AS count
              FROM question_items q
              WHERE ${whereClause.sql}
            `,
          )
          .get(...whereClause.params) as { count: number } | undefined
      )?.count ?? 0,
    );

    return {
      items: items.map(parseQuestionListItem),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  },

  listFacets() {
    const categories = sqlite
      .prepare(
        `
          SELECT q.category AS name, COUNT(*) AS count
          FROM question_items q
          WHERE q.review_status = 'active'
            AND q.category IS NOT NULL
          GROUP BY q.category
          ORDER BY count DESC, q.category COLLATE NOCASE ASC
        `,
      )
      .all() as QuestionFacet[];
    const difficulties = sqlite
      .prepare(
        `
          SELECT q.difficulty AS name, COUNT(*) AS count
          FROM question_items q
          WHERE q.review_status = 'active'
            AND q.difficulty IS NOT NULL
          GROUP BY q.difficulty
          ORDER BY count DESC, q.difficulty ASC
        `,
      )
      .all() as QuestionFacet[];
    const tags = sqlite
      .prepare(
        `
          SELECT t.name AS name, COUNT(*) AS count
          FROM question_tags qt
          INNER JOIN tags t
            ON t.id = qt.tag_id
          INNER JOIN question_items q
            ON q.id = qt.question_item_id
          WHERE q.review_status = 'active'
          GROUP BY t.id, t.name
          ORDER BY count DESC, t.name COLLATE NOCASE ASC
          LIMIT 40
        `,
      )
      .all() as QuestionFacet[];

    return {
      categories,
      difficulties: difficulties.filter(
        (item): item is QuestionFacet & { name: QuestionDifficulty } =>
          item.name === "easy" || item.name === "medium" || item.name === "hard",
      ),
      tags,
    };
  },

  findAdjacent(input: ListQuestionsInput & { questionId: string }) {
    const whereClause = buildQuestionWhereClause(input);
    const orderByClause =
      input.sort === "source_count"
        ? "q.source_count DESC, q.updated_at DESC, q.question_text COLLATE NOCASE ASC"
        : "q.updated_at DESC, q.source_count DESC, q.question_text COLLATE NOCASE ASC";

    const row = sqlite
      .prepare(
        `
          WITH ordered AS (
            SELECT
              q.id AS id,
              q.question_text AS questionText,
              ROW_NUMBER() OVER (ORDER BY ${orderByClause}) AS rowNum
            FROM question_items q
            WHERE ${whereClause.sql}
          ),
          current_row AS (
            SELECT rowNum
            FROM ordered
            WHERE id = ?
          )
          SELECT
            prev.id AS previousId,
            prev.questionText AS previousQuestionText,
            CASE
              WHEN prev.rowNum IS NULL THEN NULL
              ELSE CAST(((prev.rowNum - 1) / ?) AS INT) + 1
            END AS previousPage,
            next.id AS nextId,
            next.questionText AS nextQuestionText,
            CASE
              WHEN next.rowNum IS NULL THEN NULL
              ELSE CAST(((next.rowNum - 1) / ?) AS INT) + 1
            END AS nextPage
          FROM current_row
          LEFT JOIN ordered prev
            ON prev.rowNum = current_row.rowNum - 1
          LEFT JOIN ordered next
            ON next.rowNum = current_row.rowNum + 1
        `,
      )
      .get(
        ...whereClause.params,
        input.questionId,
        input.pageSize,
        input.pageSize,
      ) as
      | {
          previousId: string | null;
          previousQuestionText: string | null;
          previousPage: number | null;
          nextId: string | null;
          nextQuestionText: string | null;
          nextPage: number | null;
        }
      | undefined;

    function parseAdjacentQuestion(
      id: string | null,
      questionText: string | null,
      page: number | null,
    ): AdjacentQuestion | undefined {
      if (!id || !questionText || !page) {
        return undefined;
      }

      return {
        id,
        questionText,
        page,
      };
    }

    if (!row) {
      return {
        previous: undefined,
        next: undefined,
      };
    }

    return {
      previous: parseAdjacentQuestion(
        row.previousId,
        row.previousQuestionText,
        row.previousPage,
      ),
      next: parseAdjacentQuestion(row.nextId, row.nextQuestionText, row.nextPage),
    };
  },

  findById(questionId: string) {
    const question = sqlite
      .prepare(
        `
          SELECT
            q.id AS id,
            q.question_text AS questionText,
            q.canonical_answer AS canonicalAnswer,
            q.category AS category,
            q.difficulty AS difficulty,
            q.source_count AS sourceCount,
            q.review_status AS reviewStatus,
            q.updated_at AS updatedAt,
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
          FROM question_items q
          WHERE q.id = ?
            AND q.review_status = 'active'
          LIMIT 1
        `,
      )
      .get(questionId) as QuestionDetailRecord | undefined;

    if (!question) {
      return undefined;
    }

    const answerVariants = sqlite
      .prepare(
        `
          SELECT
            av.id AS id,
            av.variant_type AS variantType,
            av.content AS content
          FROM answer_variants av
          WHERE av.question_item_id = ?
            AND av.status = 'active'
          ORDER BY
            CASE av.variant_type
              WHEN 'canonical' THEN 0
              WHEN 'personal' THEN 1
              WHEN 'concise' THEN 2
              WHEN 'deep_dive' THEN 3
              ELSE 4
            END,
            av.updated_at DESC
        `,
      )
      .all(questionId) as Array<{
      id: string;
      variantType:
        | "canonical"
        | "personal"
        | "concise"
        | "deep_dive"
        | "follow_up";
      content: string;
    }>;

    const sources = sqlite
      .prepare(
        `
          SELECT
            sqr.source_document_id AS sourceDocumentId,
            sd.title AS title,
            sd.kind AS kind,
            sd.source_url AS sourceUrl,
            sqr.source_snippet AS sourceSnippet,
            ie.id AS interviewId,
            ie.company AS company,
            ie.role AS role,
            ie.round_info AS roundInfo
          FROM source_question_refs sqr
          INNER JOIN source_documents sd
            ON sd.id = sqr.source_document_id
          LEFT JOIN interview_experiences ie
            ON ie.source_document_id = sd.id
            AND ie.status = 'active'
          WHERE sqr.question_item_id = ?
          ORDER BY
            CASE WHEN sqr.source_order IS NULL THEN 1 ELSE 0 END,
            sqr.source_order ASC,
            sd.updated_at DESC
        `,
      )
      .all(questionId) as Array<{
      sourceDocumentId: string;
      title: string;
      kind: "interview_experience" | "knowledge_note" | "resume" | "manual_input";
      sourceUrl: string | null;
      sourceSnippet: string | null;
      interviewId: string | null;
      company: string | null;
      role: string | null;
      roundInfo: string | null;
    }>;
    const linkedInterviewQuestions = sqlite
      .prepare(
        `
          SELECT
            iq.id AS interviewQuestionId,
            iq.question_text AS interviewQuestionText,
            iq.source_answer AS sourceAnswer,
            iq.source_snippet AS sourceSnippet,
            iql.link_type AS linkType,
            ie.id AS interviewId,
            ie.company AS company,
            ie.role AS role,
            ie.round_info AS roundInfo
          FROM interview_question_links iql
          INNER JOIN interview_questions iq
            ON iq.id = iql.interview_question_id
          INNER JOIN interview_experiences ie
            ON ie.id = iq.interview_experience_id
          WHERE iql.question_item_id = ?
          ORDER BY iq.updated_at DESC, iq.created_at DESC
        `,
      )
      .all(questionId) as Array<{
      interviewQuestionId: string;
      interviewQuestionText: string;
      sourceAnswer: string | null;
      sourceSnippet: string | null;
      linkType: "promoted_create" | "promoted_merge";
      interviewId: string;
      company: string | null;
      role: string | null;
      roundInfo: string | null;
    }>;

    const relatedBySource = sqlite
      .prepare(
        `
          SELECT
            related.id AS id,
            related.question_text AS questionText,
            related.category AS category,
            related.source_count AS sourceCount,
            COUNT(DISTINCT sqr_other.source_document_id) AS sharedSourceCount,
            COALESCE((
              SELECT json_group_array(name)
              FROM (
                SELECT t.name AS name
                FROM question_tags qt
                INNER JOIN tags t
                  ON t.id = qt.tag_id
                WHERE qt.question_item_id = related.id
                ORDER BY t.name COLLATE NOCASE
              )
            ), '[]') AS tagsJson
          FROM source_question_refs sqr_self
          INNER JOIN source_question_refs sqr_other
            ON sqr_other.source_document_id = sqr_self.source_document_id
            AND sqr_other.question_item_id <> sqr_self.question_item_id
          INNER JOIN question_items related
            ON related.id = sqr_other.question_item_id
          WHERE sqr_self.question_item_id = ?
            AND related.review_status = 'active'
          GROUP BY related.id
          ORDER BY sharedSourceCount DESC, related.source_count DESC, related.updated_at DESC
          LIMIT 5
        `,
      )
      .all(questionId) as Array<{
      id: string;
      questionText: string;
      category: string | null;
      sourceCount: number;
      sharedSourceCount: number;
      tagsJson: string;
    }>;

    const relatedQuestions =
      relatedBySource.length > 0
        ? relatedBySource
        : question.category
          ? (sqlite
              .prepare(
                `
                  SELECT
                    related.id AS id,
                    related.question_text AS questionText,
                    related.category AS category,
                    related.source_count AS sourceCount,
                    0 AS sharedSourceCount,
                    COALESCE((
                      SELECT json_group_array(name)
                      FROM (
                        SELECT t.name AS name
                        FROM question_tags qt
                        INNER JOIN tags t
                          ON t.id = qt.tag_id
                        WHERE qt.question_item_id = related.id
                        ORDER BY t.name COLLATE NOCASE
                      )
                    ), '[]') AS tagsJson
                  FROM question_items related
                  WHERE related.review_status = 'active'
                    AND related.id <> ?
                    AND related.category = ?
                  ORDER BY related.source_count DESC, related.updated_at DESC
                  LIMIT 5
                `,
              )
              .all(questionId, question.category) as Array<{
              id: string;
              questionText: string;
              category: string | null;
              sourceCount: number;
              sharedSourceCount: number;
              tagsJson: string;
            }>)
          : [];

    return {
      id: question.id,
      questionText: question.questionText,
      canonicalAnswer: question.canonicalAnswer,
      category: question.category,
      difficulty: question.difficulty,
      sourceCount: question.sourceCount,
      reviewStatus: question.reviewStatus,
      updatedAt: question.updatedAt,
      tags: parseJsonStringArray(question.tagsJson),
      answerVariants: answerVariants.map((answerVariant) => ({
        id: answerVariant.id,
        variantType: answerVariant.variantType,
        content: answerVariant.content,
      })),
      sources: sources.map((source) => ({
        sourceDocumentId: source.sourceDocumentId,
        title: source.title,
        kind: source.kind,
        sourceUrl: source.sourceUrl,
        sourceSnippet: source.sourceSnippet,
        interviewExperience: source.interviewId
          ? {
              id: source.interviewId,
              company: source.company,
              role: source.role,
              roundInfo: source.roundInfo,
            }
          : undefined,
      })),
      linkedInterviewQuestions: linkedInterviewQuestions.map((linkedQuestion) => ({
        interviewQuestionId: linkedQuestion.interviewQuestionId,
        questionText: linkedQuestion.interviewQuestionText,
        sourceAnswer: linkedQuestion.sourceAnswer,
        sourceSnippet: linkedQuestion.sourceSnippet,
        linkType: linkedQuestion.linkType,
        interviewExperience: {
          id: linkedQuestion.interviewId,
          company: linkedQuestion.company,
          role: linkedQuestion.role,
          roundInfo: linkedQuestion.roundInfo,
        },
      })),
      relatedQuestions: relatedQuestions.map((relatedQuestion) => ({
        id: relatedQuestion.id,
        questionText: relatedQuestion.questionText,
        category: relatedQuestion.category,
        sourceCount: relatedQuestion.sourceCount,
        sharedSourceCount: relatedQuestion.sharedSourceCount,
        tags: parseJsonStringArray(relatedQuestion.tagsJson),
      })),
    };
  },
};
