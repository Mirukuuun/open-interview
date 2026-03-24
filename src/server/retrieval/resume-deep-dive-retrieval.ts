import type { RetrievalFinalContext, RetrievalHit } from "@/lib/schemas/retrieval";
import {
  chunkRepository,
  getResumeProjectSummaryChunkId,
} from "@/server/repositories/chunk-repository";
import { retrieveHybridQaContext } from "@/server/retrieval/hybrid-qa-retrieval";

type ResumeDeepDiveProjectContext = {
  id: string;
  sourceDocumentId: string;
  name: string;
  summary: string | null;
  highlights: string[];
  techStack: string[];
  deepDiveQuestions: string[];
};

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

function buildProjectSummarySnippet(project: ResumeDeepDiveProjectContext) {
  const parts = [
    project.name,
    project.summary,
    ...project.highlights.slice(0, 2),
    project.techStack.length > 0
      ? `Tech stack: ${project.techStack.join(", ")}`
      : null,
  ].filter((value): value is string => Boolean(value && value.trim()));

  return parts.join("\n");
}

export function retrieveResumeDeepDiveContext(input: {
  answer: string;
  project: ResumeDeepDiveProjectContext;
}) {
  const syncResumeProjectChunks = chunkRepository.syncResumeProjectChunks();
  const projectChunkId = getResumeProjectSummaryChunkId(input.project.id);
  const projectHit: RetrievalHit = {
    owner_type: "resume_project",
    owner_id: input.project.id,
    chunk_id: projectChunkId,
    score: 100,
    reason: "merged",
    snippet: buildProjectSummarySnippet(input.project),
  };
  const relatedQuestionQuery = [
    input.project.name,
    input.project.summary ?? "",
    input.project.techStack.join(" "),
    input.answer,
  ]
    .join(" ")
    .trim();
  const qaRetrieval =
    relatedQuestionQuery.length > 0
      ? retrieveHybridQaContext({
          query: relatedQuestionQuery,
          topK: 4,
          strategy: "hybrid",
        })
      : {
          hits: [],
          relatedQuestions: [],
          finalContext: {
            question_ids: [],
            chunk_ids: [],
            related_question_ids: [],
            source_document_ids: [],
            resume_project_ids: [],
            strategy_notes: [],
            warnings: [],
            corpus_sync: {
              question_chunks: 0,
              answer_chunks: 0,
              source_excerpt_chunks: 0,
            },
          } satisfies RetrievalFinalContext,
          questions: [],
        };
  const hits = limitUniqueHits(
    [projectHit, ...qaRetrieval.hits],
    Math.max(10, qaRetrieval.hits.length + 2),
  );
  const warnings = [...qaRetrieval.finalContext.warnings];

  if (qaRetrieval.questions.length === 0) {
    warnings.push(
      "No supplemental question-bank matches were found; deep dive coaching stayed anchored on the structured project record.",
    );
  }

  const finalContext = {
    question_ids: qaRetrieval.questions.map((question) => question.id),
    chunk_ids: Array.from(
      new Set([
        projectChunkId,
        ...qaRetrieval.finalContext.chunk_ids,
      ]),
    ),
    related_question_ids: qaRetrieval.relatedQuestions.map((question) => question.id),
    source_document_ids: [input.project.sourceDocumentId],
    resume_project_ids: [input.project.id],
    strategy_notes: [
      "Project deep dive stays anchored on the structured resume_project summary chunk.",
      qaRetrieval.questions.length > 0
        ? "Slice 5 question-bank retrieval is reused only as supplemental follow-up grounding."
        : "No reusable question-bank grounding was available for this turn.",
      `resume_project_chunks_synced: ${syncResumeProjectChunks.chunkCount}`,
    ],
    warnings,
    corpus_sync: qaRetrieval.finalContext.corpus_sync ?? {
      question_chunks: 0,
      answer_chunks: 0,
      source_excerpt_chunks: 0,
    },
  } satisfies RetrievalFinalContext;

  return {
    hits,
    relatedQuestions: qaRetrieval.relatedQuestions,
    finalContext,
  };
}
