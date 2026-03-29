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
