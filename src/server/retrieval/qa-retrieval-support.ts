import type { QaAnswerMode } from "@/lib/schemas/qa";
import type {
  RetrievalFinalContext,
  RetrievalHit,
  RetrievalMetadataFilters,
} from "@/lib/schemas/retrieval";
import { sqlite } from "@/server/db/client";
import { chunkRepository } from "@/server/repositories/chunk-repository";
import { normalizeTagName } from "@/server/repositories/normalization";
import type { QaMilvusFoundationSnapshot } from "@/server/vector/qa-milvus-foundation";

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const qaRelevanceNoisePatterns = [
  /我真正想问的是/gu,
  /我想问的是/gu,
  /我问(?:你)?的?(?:是|事)?/gu,
  /我说的是/gu,
  /我讲的是/gu,
  /重点(?:是|在)/gu,
  /这个问题|这个题|这道题|这题/gu,
  /怎么理解|怎么回答|怎么讲|怎么说|怎么看|是什么意思|是什么|有哪几种|有哪些|介绍一下|说一下|讲一下|聊一下/gu,
  /一下/gu,
];

function listDistinctValues(sqlQuery: string) {
  return (
    sqlite.prepare(sqlQuery).all() as Array<{
      value: string | null;
    }>
  )
    .map((row) => compactWhitespace(row.value ?? ""))
    .filter((value) => value.length > 0);
}

function detectTextMatches(query: string, values: string[]) {
  const normalizedQuery = query.toLowerCase();

  return values.filter((value) => normalizedQuery.includes(value.toLowerCase()));
}

function detectTagMatches(query: string, tags: string[]) {
  const normalizedQuery = normalizeTagName(query);

  return tags.filter((tag) => normalizedQuery.includes(normalizeTagName(tag)));
}

export function detectQaMetadataFilters(query: string): RetrievalMetadataFilters {
  const normalizedQuery = compactWhitespace(query);
  const categories = detectTextMatches(
    normalizedQuery,
    listDistinctValues(`
      SELECT DISTINCT category AS value
      FROM question_items
      WHERE review_status = 'active'
        AND category IS NOT NULL
      ORDER BY category COLLATE NOCASE ASC
    `),
  );
  const tags = detectTagMatches(
    normalizedQuery,
    listDistinctValues(`
      SELECT DISTINCT name AS value
      FROM tags
      ORDER BY name COLLATE NOCASE ASC
    `),
  );
  const companies = detectTextMatches(
    normalizedQuery,
    listDistinctValues(`
      SELECT DISTINCT company AS value
      FROM interview_experiences
      WHERE status = 'active'
        AND company IS NOT NULL
      ORDER BY company COLLATE NOCASE ASC
    `),
  );
  const roles = detectTextMatches(
    normalizedQuery,
    listDistinctValues(`
      SELECT DISTINCT role AS value
      FROM interview_experiences
      WHERE status = 'active'
        AND role IS NOT NULL
      ORDER BY role COLLATE NOCASE ASC
    `),
  );

  return {
    categories,
    tags,
    companies,
    roles,
  };
}

export function questionMatchesQaFilters(
  question: {
    category: string | null;
    tags: string[];
    sources: Array<{
      interviewExperience?: {
        company: string | null | undefined;
        role: string | null | undefined;
      };
    }>;
  },
  filters: RetrievalMetadataFilters,
) {
  const hasCategoryMatch =
    filters.categories.length === 0 ||
    (question.category ? filters.categories.includes(question.category) : false);
  const hasTagMatch =
    filters.tags.length === 0 ||
    question.tags.some((tag) => filters.tags.includes(tag));
  const hasCompanyMatch =
    filters.companies.length === 0 ||
    question.sources.some((source) =>
      source.interviewExperience?.company
        ? filters.companies.includes(source.interviewExperience.company)
        : false,
    );
  const hasRoleMatch =
    filters.roles.length === 0 ||
    question.sources.some((source) =>
      source.interviewExperience?.role
        ? filters.roles.includes(source.interviewExperience.role)
        : false,
    );

  return hasCategoryMatch && hasTagMatch && hasCompanyMatch && hasRoleMatch;
}

export function applyQuestionFilters<TQuestion extends Parameters<
  typeof questionMatchesQaFilters
>[0]>(
  questions: TQuestion[],
  filters: RetrievalMetadataFilters,
) {
  const hasFilters =
    filters.categories.length > 0 ||
    filters.tags.length > 0 ||
    filters.companies.length > 0 ||
    filters.roles.length > 0;

  if (!hasFilters) {
    return questions;
  }

  return questions.filter((question) => questionMatchesQaFilters(question, filters));
}

function normalizeQaDirectRelevanceQuery(query: string) {
  let normalizedQuery = compactWhitespace(query).toLowerCase();

  for (const pattern of qaRelevanceNoisePatterns) {
    normalizedQuery = normalizedQuery.replace(pattern, " ");
  }

  return compactWhitespace(
    normalizedQuery.replace(/[，。！？!?、；：“”"'（）()\[\]{}<>《》]/gu, " "),
  );
}

function collectAsciiTerms(value: string) {
  return Array.from(new Set(value.match(/[a-z0-9][a-z0-9+._-]{1,}/g) ?? []));
}

function collectChineseTerms(value: string) {
  const segments = value.match(/[\u4e00-\u9fff]{2,}/gu) ?? [];
  const exactTerms = new Set<string>();
  const bigrams = new Set<string>();

  for (const segment of segments) {
    exactTerms.add(segment);

    if (segment.length === 2) {
      bigrams.add(segment);
      continue;
    }

    for (let index = 0; index < segment.length - 1; index += 1) {
      bigrams.add(segment.slice(index, index + 2));
    }
  }

  return {
    exactTerms: Array.from(exactTerms),
    bigrams: Array.from(bigrams),
  };
}

function normalizeQaCandidateText(value: string) {
  return compactWhitespace(value).toLowerCase();
}

export function scoreQaQuestionDirectRelevance(
  query: string,
  question: {
    questionText: string;
    canonicalAnswer: string | null;
    category?: string | null;
    tags?: string[];
  },
) {
  const normalizedQuery = normalizeQaDirectRelevanceQuery(query);

  if (normalizedQuery.length === 0) {
    return 0;
  }

  const asciiTerms = collectAsciiTerms(normalizedQuery);
  const chineseTerms = collectChineseTerms(normalizedQuery);
  const haystack = normalizeQaCandidateText(
    [
      question.questionText,
      question.canonicalAnswer ?? "",
      question.category ?? "",
      ...(question.tags ?? []),
    ].join(" "),
  );
  let score = 0;
  let matchedTermCount = 0;

  for (const term of asciiTerms) {
    if (haystack.includes(term)) {
      score += 2.4;
      matchedTermCount += 1;
    }
  }

  for (const term of chineseTerms.exactTerms) {
    if (haystack.includes(term)) {
      score += term.length >= 4 ? 3.2 : 2.2;
      matchedTermCount += 1;
    }
  }

  let matchedBigramCount = 0;

  for (const bigram of chineseTerms.bigrams) {
    if (haystack.includes(bigram)) {
      matchedBigramCount += 1;
    }
  }

  if (matchedTermCount === 0 && matchedBigramCount === 0) {
    return 0;
  }

  return score + matchedBigramCount * 0.6;
}

export function filterQuestionsByDirectRelevance<TQuestion extends {
  questionText: string;
  canonicalAnswer: string | null;
  category?: string | null;
  tags?: string[];
}>(
  query: string,
  questions: TQuestion[],
) {
  const scoredQuestions = questions
    .map((question) => ({
      question,
      score: scoreQaQuestionDirectRelevance(query, question),
    }))
    .sort((left, right) => right.score - left.score);
  const topScore = scoredQuestions[0]?.score ?? 0;

  if (topScore < 1.2) {
    return [];
  }

  const threshold = Math.max(1.2, topScore * 0.65);

  return scoredQuestions
    .filter((item) => item.score >= threshold)
    .map((item) => item.question);
}

export function classifyQaSupportLevel(input: {
  citationCount: number;
  questionCount: number;
  lexicalHitCount: number;
  vectorHitCount: number;
}) {
  if (input.citationCount === 0 || input.questionCount === 0) {
    return "no_grounded_support" as QaAnswerMode;
  }

  if (
    input.citationCount >= 2 &&
    input.lexicalHitCount > 0 &&
    input.vectorHitCount > 0
  ) {
    return "grounded_answered" as QaAnswerMode;
  }

  if (input.citationCount >= 2 && input.lexicalHitCount >= 2) {
    return "grounded_answered" as QaAnswerMode;
  }

  return "weak_support" as QaAnswerMode;
}

export function buildQaRetrievalSummary(input: {
  questionCount: number;
  citationCount: number;
  lexicalHitCount: number;
  vectorHitCount: number;
  rewriteApplied: boolean;
  answerMode: QaAnswerMode;
}) {
  const rewritePart = input.rewriteApplied ? "已应用 history-aware rewrite，" : "";

  return `${rewritePart}lexical 命中 ${input.lexicalHitCount} 条、vector 命中 ${input.vectorHitCount} 条，最终选择 ${input.questionCount} 个问题上下文和 ${input.citationCount} 条引用，support=${input.answerMode}。`;
}

export function buildQaFinalContext(input: {
  questionIds: string[];
  chunkIds: string[];
  relatedQuestionIds: string[];
  sourceDocumentIds: string[];
  normalizedQuery: string;
  rewrittenQuery: string | null;
  rewriteApplied: boolean;
  metadataFilters: RetrievalMetadataFilters;
  supportLevel: QaAnswerMode;
  retrievalSummary: string;
  lexicalHitCount: number;
  vectorHitCount: number;
  hits: RetrievalHit[];
  foundationSnapshot?: QaMilvusFoundationSnapshot | null;
  warnings: string[];
  strategyNotes: string[];
}) {
  const fallbackChunkSync = input.foundationSnapshot
    ? null
    : {
        question: chunkRepository.syncQuestionChunks(),
        answerVariant: chunkRepository.syncAnswerVariantChunks(),
        sourceExcerpt: chunkRepository.syncSourceExcerptChunks(),
      };

  return {
    question_ids: input.questionIds,
    chunk_ids: input.chunkIds,
    related_question_ids: input.relatedQuestionIds,
    source_document_ids: input.sourceDocumentIds,
    resume_project_ids: [],
    normalized_query: input.normalizedQuery,
    rewritten_query: input.rewrittenQuery,
    rewrite_applied: input.rewriteApplied,
    metadata_filters: input.metadataFilters,
    support_level: input.supportLevel,
    support_summary: input.retrievalSummary,
    retrieval_summary: input.retrievalSummary,
    channel_counts: {
      lexical_hits: input.lexicalHitCount,
      vector_hits: input.vectorHitCount,
      merged_hits: input.hits.length,
    },
    strategy_notes: input.strategyNotes,
    warnings: input.warnings,
    corpus_sync: {
      question_chunks:
        input.foundationSnapshot?.questionChunkCount ??
        fallbackChunkSync?.question.questionChunkCount ??
        0,
      answer_chunks:
        input.foundationSnapshot?.answerChunkCount ??
        ((fallbackChunkSync?.question.answerChunkCount ?? 0) +
          (fallbackChunkSync?.answerVariant.chunkCount ?? 0)),
      source_excerpt_chunks:
        input.foundationSnapshot?.sourceExcerptChunkCount ??
        fallbackChunkSync?.sourceExcerpt.chunkCount ??
        0,
      milvus_status: input.foundationSnapshot?.status,
      milvus_collection: input.foundationSnapshot?.collectionName,
      pending_embeddings: input.foundationSnapshot?.pendingEmbeddingCount,
      pending_syncs: input.foundationSnapshot?.pendingSyncCount,
      synced_documents: input.foundationSnapshot?.syncedDocumentCount,
      pending_delete_jobs: input.foundationSnapshot?.pendingDeleteJobCount,
      processed_chunks: input.foundationSnapshot?.processedChunkCount,
    },
  } satisfies RetrievalFinalContext;
}
