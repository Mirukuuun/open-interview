import type {
  QaCitation,
  RetrievalFinalContext,
  RetrievalHit,
} from "@/lib/schemas/qa";
import { normalizeTagName } from "@/server/repositories/normalization";
import {
  buildFtsPhraseQuery,
  buildLikePattern,
  shouldUseFtsQuery,
} from "@/server/repositories/search-helpers";
import { sqlite } from "@/server/db/client";
import {
  chunkRepository,
  getAnswerVariantChunkId,
  getQuestionTextChunkId,
  getSourceExcerptChunkId,
} from "@/server/repositories/chunk-repository";
import { questionBrowseRepository } from "@/server/repositories/question-browse-repository";

type QaStrategy = "fts" | "hybrid";

type QuestionCandidate = {
  id: string;
  score: number;
  sourceCount: number;
  hits: RetrievalHit[];
};

function mergeCandidate(
  candidateMap: Map<string, QuestionCandidate>,
  input: {
    questionId: string;
    score: number;
    sourceCount: number;
    hit: RetrievalHit;
  },
) {
  const existing = candidateMap.get(input.questionId);

  if (!existing) {
    candidateMap.set(input.questionId, {
      id: input.questionId,
      score: input.score,
      sourceCount: input.sourceCount,
      hits: [input.hit],
    });
    return;
  }

  existing.score += input.score;
  existing.sourceCount = Math.max(existing.sourceCount, input.sourceCount);
  existing.hits.push(input.hit);
}

function limitUniqueHits(hits: RetrievalHit[], limit: number) {
  const uniqueHits = new Map<string, RetrievalHit>();

  for (const hit of hits.sort((left, right) => right.score - left.score)) {
    const key = `${hit.owner_type}:${hit.owner_id}:${hit.chunk_id ?? ""}:${hit.reason}`;

    if (!uniqueHits.has(key)) {
      uniqueHits.set(key, hit);
    }

    if (uniqueHits.size >= limit) {
      break;
    }
  }

  return Array.from(uniqueHits.values());
}

function buildQuestionLexicalCandidates(query: string, topK: number) {
  const limit = Math.max(topK * 2, 8);

  if (shouldUseFtsQuery(query)) {
    const rows = sqlite
      .prepare(`
        SELECT
          q.id AS questionId,
          q.question_text AS questionText,
          q.source_count AS sourceCount
        FROM question_search
        INNER JOIN question_items q
          ON q.id = question_search.question_id
        WHERE question_search MATCH ?
          AND q.review_status = 'active'
        ORDER BY bm25(question_search, 3.0, 1.3, 0.9), q.source_count DESC, q.updated_at DESC
        LIMIT ?
      `)
      .all(buildFtsPhraseQuery(query), limit) as Array<{
      questionId: string;
      questionText: string;
      sourceCount: number;
    }>;

    if (rows.length > 0) {
      return rows.map((row, index) => ({
        questionId: row.questionId,
        sourceCount: row.sourceCount,
        score: Math.max(36, 100 - index * 6 + Math.min(row.sourceCount, 6)),
        hit: {
          owner_type: "question_item" as const,
          owner_id: row.questionId,
          chunk_id: getQuestionTextChunkId(row.questionId),
          score: Math.max(36, 100 - index * 6 + Math.min(row.sourceCount, 6)),
          reason: "fts" as const,
          snippet: row.questionText,
        },
      }));
    }
  }

  const likePattern = buildLikePattern(query);
  const rows = sqlite
    .prepare(`
      SELECT
        q.id AS questionId,
        q.question_text AS questionText,
        q.source_count AS sourceCount
      FROM question_items q
      WHERE q.review_status = 'active'
        AND (
          q.question_text LIKE ? ESCAPE '\\'
          OR COALESCE(q.canonical_answer, '') LIKE ? ESCAPE '\\'
          OR EXISTS (
            SELECT 1
            FROM question_tags qt
            INNER JOIN tags t
              ON t.id = qt.tag_id
            WHERE qt.question_item_id = q.id
              AND t.name LIKE ? ESCAPE '\\'
          )
        )
      ORDER BY q.source_count DESC, q.updated_at DESC, q.question_text COLLATE NOCASE ASC
      LIMIT ?
    `)
    .all(likePattern, likePattern, likePattern, limit) as Array<{
    questionId: string;
    questionText: string;
    sourceCount: number;
  }>;

  return rows.map((row, index) => ({
    questionId: row.questionId,
    sourceCount: row.sourceCount,
    score: Math.max(28, 84 - index * 5 + Math.min(row.sourceCount, 4)),
    hit: {
      owner_type: "question_item" as const,
      owner_id: row.questionId,
      chunk_id: getQuestionTextChunkId(row.questionId),
      score: Math.max(28, 84 - index * 5 + Math.min(row.sourceCount, 4)),
      reason: "fts" as const,
      snippet: row.questionText,
    },
  }));
}

function buildAnswerVariantCandidates(query: string, topK: number) {
  const likePattern = buildLikePattern(query);
  const rows = sqlite
    .prepare(`
      SELECT
        av.id AS answerVariantId,
        av.question_item_id AS questionId,
        av.variant_type AS variantType,
        av.content AS content,
        q.source_count AS sourceCount
      FROM answer_variants av
      INNER JOIN question_items q
        ON q.id = av.question_item_id
      WHERE av.status = 'active'
        AND q.review_status = 'active'
        AND av.content LIKE ? ESCAPE '\\'
      ORDER BY
        CASE av.variant_type
          WHEN 'canonical' THEN 0
          WHEN 'personal' THEN 1
          ELSE 2
        END,
        q.source_count DESC,
        q.updated_at DESC
      LIMIT ?
    `)
    .all(likePattern, Math.max(topK, 6)) as Array<{
    answerVariantId: string;
    questionId: string;
    variantType: "canonical" | "personal" | "concise" | "deep_dive" | "follow_up";
    content: string;
    sourceCount: number;
  }>;

  return rows.map((row, index) => {
    const score = Math.max(
      18,
      70 - index * 5 + (row.variantType === "canonical" ? 5 : 2),
    );

    return {
      questionId: row.questionId,
      sourceCount: row.sourceCount,
      score,
      hit: {
        owner_type: "answer_variant" as const,
        owner_id: row.answerVariantId,
        chunk_id: getAnswerVariantChunkId(row.answerVariantId),
        score,
        reason: "fts" as const,
        snippet: row.content,
      },
    };
  });
}

function buildDirectTagCandidates(query: string, topK: number) {
  const normalizedQuery = normalizeTagName(query);
  const matchedTags = (
    sqlite.prepare(`
      SELECT t.name AS name, t.normalized_name AS normalizedName
      FROM tags t
      ORDER BY t.name COLLATE NOCASE ASC
    `).all() as Array<{
      name: string;
      normalizedName: string;
    }>
  ).filter((tag) => normalizedQuery.includes(tag.normalizedName));

  if (matchedTags.length === 0) {
    return [];
  }

  const placeholders = matchedTags.map(() => "?").join(", ");
  const rows = sqlite
    .prepare(`
      SELECT
        q.id AS questionId,
        q.question_text AS questionText,
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
    `)
    .all(
      ...matchedTags.map((tag) => tag.normalizedName),
      Math.max(topK, 6),
    ) as Array<{
    questionId: string;
    questionText: string;
    sourceCount: number;
    matchedTagCount: number;
  }>;

  return rows.map((row, index) => {
    const score = Math.max(18, 56 - index * 3 + row.matchedTagCount * 6);

    return {
      questionId: row.questionId,
      sourceCount: row.sourceCount,
      score,
      hit: {
        owner_type: "question_item" as const,
        owner_id: row.questionId,
        chunk_id: getQuestionTextChunkId(row.questionId),
        score,
        reason: "merged" as const,
        snippet: row.questionText,
      },
    };
  });
}

function buildSharedSourceCandidates(seedQuestionIds: string[], topK: number) {
  if (seedQuestionIds.length === 0) {
    return [];
  }

  const placeholders = seedQuestionIds.map(() => "?").join(", ");
  const rows = sqlite
    .prepare(`
      SELECT
        related.id AS questionId,
        related.question_text AS questionText,
        related.source_count AS sourceCount,
        COUNT(DISTINCT sqr_other.source_document_id) AS sharedSourceCount
      FROM source_question_refs sqr_self
      INNER JOIN source_question_refs sqr_other
        ON sqr_other.source_document_id = sqr_self.source_document_id
        AND sqr_other.question_item_id <> sqr_self.question_item_id
      INNER JOIN question_items related
        ON related.id = sqr_other.question_item_id
      WHERE sqr_self.question_item_id IN (${placeholders})
        AND related.review_status = 'active'
      GROUP BY related.id
      ORDER BY sharedSourceCount DESC, related.source_count DESC, related.updated_at DESC
      LIMIT ?
    `)
    .all(...seedQuestionIds, Math.max(topK, 6)) as Array<{
    questionId: string;
    questionText: string;
    sourceCount: number;
    sharedSourceCount: number;
  }>;

  return rows.map((row, index) => {
    const score = Math.max(14, 52 - index * 3 + row.sharedSourceCount * 8);

    return {
      questionId: row.questionId,
      sourceCount: row.sourceCount,
      score,
      hit: {
        owner_type: "question_item" as const,
        owner_id: row.questionId,
        chunk_id: getQuestionTextChunkId(row.questionId),
        score,
        reason: "merged" as const,
        snippet: row.questionText,
      },
    };
  });
}

function buildSharedTagCandidates(seedQuestionIds: string[], topK: number) {
  if (seedQuestionIds.length === 0) {
    return [];
  }

  const placeholders = seedQuestionIds.map(() => "?").join(", ");
  const rows = sqlite
    .prepare(`
      SELECT
        related.id AS questionId,
        related.question_text AS questionText,
        related.source_count AS sourceCount,
        COUNT(DISTINCT qt_other.tag_id) AS sharedTagCount
      FROM question_tags qt_self
      INNER JOIN question_tags qt_other
        ON qt_other.tag_id = qt_self.tag_id
        AND qt_other.question_item_id <> qt_self.question_item_id
      INNER JOIN question_items related
        ON related.id = qt_other.question_item_id
      WHERE qt_self.question_item_id IN (${placeholders})
        AND related.review_status = 'active'
      GROUP BY related.id
      ORDER BY sharedTagCount DESC, related.source_count DESC, related.updated_at DESC
      LIMIT ?
    `)
    .all(...seedQuestionIds, Math.max(topK, 6)) as Array<{
    questionId: string;
    questionText: string;
    sourceCount: number;
    sharedTagCount: number;
  }>;

  return rows.map((row, index) => {
    const score = Math.max(12, 48 - index * 3 + row.sharedTagCount * 7);

    return {
      questionId: row.questionId,
      sourceCount: row.sourceCount,
      score,
      hit: {
        owner_type: "question_item" as const,
        owner_id: row.questionId,
        chunk_id: getQuestionTextChunkId(row.questionId),
        score,
        reason: "merged" as const,
        snippet: row.questionText,
      },
    };
  });
}

function buildCitation(question: NonNullable<ReturnType<typeof questionBrowseRepository.findById>>) {
  const primarySource = question.sources[0];

  return {
    owner_type: "question_item" as const,
    owner_id: question.id,
    label: question.questionText,
    href: `/questions/${question.id}`,
    snippet: question.canonicalAnswer ?? primarySource?.sourceSnippet ?? null,
    ...(primarySource
      ? {
          source_document: {
            id: primarySource.sourceDocumentId,
            title: primarySource.title,
            href: primarySource.interviewExperience
              ? `/interviews/${primarySource.interviewExperience.id}`
              : null,
            source_snippet: primarySource.sourceSnippet ?? null,
          },
        }
      : {}),
  } satisfies QaCitation;
}

function buildSourceSupportHits(
  questions: Array<NonNullable<ReturnType<typeof questionBrowseRepository.findById>>>,
  candidateMap: Map<string, QuestionCandidate>,
) {
  const hits: RetrievalHit[] = [];

  for (const question of questions) {
    const primarySource = question.sources[0];
    const candidate = candidateMap.get(question.id);

    if (!primarySource?.sourceSnippet || !candidate) {
      continue;
    }

    hits.push({
      owner_type: "source_document",
      owner_id: primarySource.sourceDocumentId,
      chunk_id: getSourceExcerptChunkId(primarySource.sourceDocumentId, question.id),
      score: Math.max(10, candidate.score - 8),
      reason: "merged",
      snippet: primarySource.sourceSnippet,
    });
  }

  return hits;
}

function buildRelatedQuestions(
  questions: Array<NonNullable<ReturnType<typeof questionBrowseRepository.findById>>>,
) {
  const selectedQuestionIds = new Set(questions.map((question) => question.id));
  const relatedQuestionMap = new Map<
    string,
    NonNullable<ReturnType<typeof questionBrowseRepository.findById>>["relatedQuestions"][number]
  >();

  for (const question of questions) {
    for (const relatedQuestion of question.relatedQuestions) {
      if (selectedQuestionIds.has(relatedQuestion.id)) {
        continue;
      }

      if (!relatedQuestionMap.has(relatedQuestion.id)) {
        relatedQuestionMap.set(relatedQuestion.id, relatedQuestion);
      }
    }
  }

  return Array.from(relatedQuestionMap.values())
    .sort((left, right) => {
      if ((right.sharedSourceCount ?? 0) !== (left.sharedSourceCount ?? 0)) {
        return (right.sharedSourceCount ?? 0) - (left.sharedSourceCount ?? 0);
      }

      return right.sourceCount - left.sourceCount;
    })
    .slice(0, 6);
}

export function retrieveHybridQaContext(input: {
  query: string;
  topK: number;
  strategy: QaStrategy;
}) {
  const syncQuestionChunks = chunkRepository.syncQuestionChunks();
  const syncAnswerVariantChunks = chunkRepository.syncAnswerVariantChunks();
  const syncSourceExcerptChunks = chunkRepository.syncSourceExcerptChunks();
  const candidateMap = new Map<string, QuestionCandidate>();

  for (const candidate of buildQuestionLexicalCandidates(input.query, input.topK)) {
    mergeCandidate(candidateMap, {
      questionId: candidate.questionId,
      score: candidate.score,
      sourceCount: candidate.sourceCount,
      hit: candidate.hit,
    });
  }

  for (const candidate of buildAnswerVariantCandidates(input.query, input.topK)) {
    mergeCandidate(candidateMap, {
      questionId: candidate.questionId,
      score: candidate.score,
      sourceCount: candidate.sourceCount,
      hit: candidate.hit,
    });
  }

  if (input.strategy === "hybrid") {
    for (const candidate of buildDirectTagCandidates(input.query, input.topK)) {
      mergeCandidate(candidateMap, {
        questionId: candidate.questionId,
        score: candidate.score,
        sourceCount: candidate.sourceCount,
        hit: candidate.hit,
      });
    }

    const seedQuestionIds = Array.from(candidateMap.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.max(4, Math.min(input.topK, 6)))
      .map((candidate) => candidate.id);

    for (const candidate of buildSharedSourceCandidates(seedQuestionIds, input.topK)) {
      mergeCandidate(candidateMap, {
        questionId: candidate.questionId,
        score: candidate.score,
        sourceCount: candidate.sourceCount,
        hit: candidate.hit,
      });
    }

    for (const candidate of buildSharedTagCandidates(seedQuestionIds, input.topK)) {
      mergeCandidate(candidateMap, {
        questionId: candidate.questionId,
        score: candidate.score,
        sourceCount: candidate.sourceCount,
        hit: candidate.hit,
      });
    }
  }

  const topQuestionIds = Array.from(candidateMap.values())
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.sourceCount - left.sourceCount;
    })
    .slice(0, input.topK)
    .map((candidate) => candidate.id);
  const questions = topQuestionIds
    .map((questionId) => questionBrowseRepository.findById(questionId))
    .filter(
      (
        question,
      ): question is NonNullable<ReturnType<typeof questionBrowseRepository.findById>> =>
        question !== undefined,
    );
  const citations = questions.slice(0, 4).map(buildCitation);
  const relatedQuestions = buildRelatedQuestions(questions);
  const sourceSupportHits = buildSourceSupportHits(questions, candidateMap);
  const rawHits = Array.from(candidateMap.values()).flatMap((candidate) => candidate.hits);
  const hits = limitUniqueHits([...rawHits, ...sourceSupportHits], Math.max(input.topK * 3, 12));
  const finalContext = {
    question_ids: questions.map((question) => question.id),
    chunk_ids: Array.from(
      new Set(
        hits
          .map((hit) => hit.chunk_id)
          .filter((chunkId): chunkId is string => Boolean(chunkId)),
      ),
    ),
    related_question_ids: relatedQuestions.map((question) => question.id),
    source_document_ids: Array.from(
      new Set(
        citations
          .map((citation) => citation.source_document?.id)
          .filter((sourceDocumentId): sourceDocumentId is string =>
            Boolean(sourceDocumentId),
          ),
      ),
    ),
    resume_project_ids: [],
    strategy_notes:
      input.strategy === "hybrid"
        ? [
            "Slice 5 hybrid retrieval uses question FTS plus structured tag/source expansion over persisted local chunks.",
            "Embeddings are intentionally deferred in this slice; no external vector store is used.",
          ]
        : ["Slice 5 FTS retrieval uses lexical recall only."],
    warnings:
      citations.length === 0
        ? ["No grounded citations were found for this query in the local bank."]
        : [],
    corpus_sync: {
      question_chunks: syncQuestionChunks.questionChunkCount,
      answer_chunks:
        syncQuestionChunks.answerChunkCount + syncAnswerVariantChunks.chunkCount,
      source_excerpt_chunks: syncSourceExcerptChunks.chunkCount,
    },
  } satisfies RetrievalFinalContext;

  return {
    strategy: input.strategy,
    hits,
    citations,
    relatedQuestions,
    finalContext,
    questions,
  };
}
