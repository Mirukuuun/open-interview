import { sqlite } from "@/server/db/client";
import { normalizeTagName } from "@/server/repositories/normalization";
import {
  buildFtsPhraseQuery,
  buildLikePattern,
  parseJsonStringArray,
  shouldUseFtsQuery,
} from "@/server/repositories/search-helpers";

/**
 * [POS] 为面经题提供题库候选推荐的检索读模型。
 * [IN] 面经题题面、分类、标签、排除的题库题 id。
 * [OUT] 返回按本地检索分数排序的题库题卡片，供面经详情页展示 topK 建议。
 *
 * @feature open-interview-interviews-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

type RecommendedQuestionInput = {
  questionText: string;
  category?: string | null;
  tags: string[];
  excludeQuestionIds?: string[];
  limit: number;
};

type RecommendedQuestionScore = {
  id: string;
  score: number;
};

function mergeRecommendedQuestionScore(
  scoreMap: Map<string, RecommendedQuestionScore>,
  input: {
    id: string;
    score: number;
  },
) {
  const existing = scoreMap.get(input.id);

  if (!existing) {
    scoreMap.set(input.id, {
      id: input.id,
      score: input.score,
    });
    return;
  }

  existing.score += input.score;
}

function hydrateQuestionCards(questionIds: string[]) {
  if (questionIds.length === 0) {
    return [];
  }

  const placeholders = questionIds.map(() => "?").join(", ");
  const rows = sqlite
    .prepare(
      `
        SELECT
          q.id AS id,
          q.question_text AS questionText,
          q.category AS category,
          q.source_count AS sourceCount,
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
        WHERE q.id IN (${placeholders})
      `,
    )
    .all(...questionIds) as Array<{
    id: string;
    questionText: string;
    category: string | null;
    sourceCount: number;
    tagsJson: string;
  }>;
  const rowMap = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        questionText: row.questionText,
        category: row.category,
        sourceCount: row.sourceCount,
        tags: parseJsonStringArray(row.tagsJson),
      },
    ]),
  );

  return questionIds
    .map((questionId) => rowMap.get(questionId))
    .filter(
      (
        row,
      ): row is {
        id: string;
        questionText: string;
        category: string | null;
        sourceCount: number;
        tags: string[];
      } => row !== undefined,
    );
}

export function listRecommendedQuestionsForInterviewQuestion(
  input: RecommendedQuestionInput,
) {
  const trimmedQuestionText = input.questionText.trim();

  if (trimmedQuestionText.length === 0) {
    return [];
  }

  const limit = Math.max(input.limit, 3);
  const scoreMap = new Map<string, RecommendedQuestionScore>();
  const excludedQuestionIds = new Set(input.excludeQuestionIds ?? []);

  if (shouldUseFtsQuery(trimmedQuestionText)) {
    const rows = sqlite
      .prepare(
        `
          SELECT
            q.id AS id,
            q.source_count AS sourceCount
          FROM question_search
          INNER JOIN question_items q
            ON q.id = question_search.question_id
          WHERE question_search MATCH ?
            AND q.review_status = 'active'
          ORDER BY bm25(question_search, 3.0, 1.3, 0.9), q.source_count DESC, q.updated_at DESC
          LIMIT ?
        `,
      )
      .all(buildFtsPhraseQuery(trimmedQuestionText), Math.max(limit * 2, 8)) as Array<{
      id: string;
      sourceCount: number;
    }>;

    rows.forEach((row, index) => {
      mergeRecommendedQuestionScore(scoreMap, {
        id: row.id,
        score: Math.max(40, 120 - index * 8 + Math.min(row.sourceCount, 6)),
      });
    });
  }

  const likePattern = buildLikePattern(trimmedQuestionText);
  const directRows = sqlite
    .prepare(
      `
        SELECT
          q.id AS id,
          q.source_count AS sourceCount
        FROM question_items q
        WHERE q.review_status = 'active'
          AND (
            q.question_text LIKE ? ESCAPE '\\'
            OR COALESCE(q.canonical_answer, '') LIKE ? ESCAPE '\\'
          )
        ORDER BY q.source_count DESC, q.updated_at DESC
        LIMIT ?
      `,
    )
    .all(likePattern, likePattern, Math.max(limit * 3, 12)) as Array<{
    id: string;
    sourceCount: number;
  }>;

  directRows.forEach((row, index) => {
    mergeRecommendedQuestionScore(scoreMap, {
      id: row.id,
      score: Math.max(24, 72 - index * 5 + Math.min(row.sourceCount, 5)),
    });
  });

  const answerRows = sqlite
    .prepare(
      `
        SELECT
          q.id AS id,
          q.source_count AS sourceCount
        FROM answer_variants av
        INNER JOIN question_items q
          ON q.id = av.question_item_id
        WHERE q.review_status = 'active'
          AND av.status = 'active'
          AND av.content LIKE ? ESCAPE '\\'
        ORDER BY
          CASE av.variant_type
            WHEN 'canonical' THEN 0
            ELSE 1
          END,
          q.source_count DESC,
          q.updated_at DESC
        LIMIT ?
      `,
    )
    .all(likePattern, Math.max(limit * 2, 8)) as Array<{
    id: string;
    sourceCount: number;
  }>;

  answerRows.forEach((row, index) => {
    mergeRecommendedQuestionScore(scoreMap, {
      id: row.id,
      score: Math.max(18, 58 - index * 4 + Math.min(row.sourceCount, 4)),
    });
  });

  const normalizedTags = Array.from(
    new Set(input.tags.map((tag) => normalizeTagName(tag)).filter(Boolean)),
  );

  if (normalizedTags.length > 0) {
    const placeholders = normalizedTags.map(() => "?").join(", ");
    const tagRows = sqlite
      .prepare(
        `
          SELECT
            q.id AS id,
            q.source_count AS sourceCount,
            COUNT(DISTINCT qt.tag_id) AS matchedTagCount
          FROM question_items q
          INNER JOIN question_tags qt
            ON qt.question_item_id = q.id
          INNER JOIN tags t
            ON t.id = qt.tag_id
          WHERE q.review_status = 'active'
            AND t.normalized_name IN (${placeholders})
          GROUP BY q.id
          ORDER BY matchedTagCount DESC, q.source_count DESC, q.updated_at DESC
          LIMIT ?
        `,
      )
      .all(...normalizedTags, Math.max(limit * 2, 8)) as Array<{
      id: string;
      sourceCount: number;
      matchedTagCount: number;
    }>;

    tagRows.forEach((row) => {
      mergeRecommendedQuestionScore(scoreMap, {
        id: row.id,
        score: 18 + row.matchedTagCount * 16 + Math.min(row.sourceCount, 4),
      });
    });
  }

  if (input.category) {
    const categoryRows = sqlite
      .prepare(
        `
          SELECT
            q.id AS id,
            q.source_count AS sourceCount
          FROM question_items q
          WHERE q.review_status = 'active'
            AND q.category = ?
          ORDER BY q.source_count DESC, q.updated_at DESC
          LIMIT ?
        `,
      )
      .all(input.category, Math.max(limit * 2, 8)) as Array<{
      id: string;
      sourceCount: number;
    }>;

    categoryRows.forEach((row, index) => {
      mergeRecommendedQuestionScore(scoreMap, {
        id: row.id,
        score: Math.max(10, 24 - index * 2 + Math.min(row.sourceCount, 3)),
      });
    });
  }

  return hydrateQuestionCards(
    Array.from(scoreMap.values())
      .filter((row) => !excludedQuestionIds.has(row.id))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((row) => row.id),
  ).map((row) => ({
    ...row,
    score: scoreMap.get(row.id)?.score ?? 0,
  }));
}
