import type {
  ConfirmParseJobRequest,
  ParseJobListItem,
  ParseJobStatus,
  ParseJobStatusSummary,
  ParseJobSummary,
} from "@/lib/schemas/parse-jobs";
import type {
  ParseInterviewExperience,
  ParseResult,
} from "@/lib/schemas/parse-result";
import { openClawParseSourceAdapter } from "@/server/adapters/openclaw/parse-source";
import { sqlite } from "@/server/db/client";
import {
  interviewExperienceRepository,
  parseJobRepository,
  questionRepository,
  sourceDocumentRepository,
} from "@/server/repositories";
import type { SourceDocumentRecord } from "@/server/repositories/source-document-repository";

type ReviewQueueFilters = {
  status?: ParseJobStatus;
  kind?: ParseJobListItem["source_kind"];
  query?: string;
  page?: number;
  pageSize?: number;
};

type ReviewQueueData = {
  items: ParseJobListItem[];
  page: number;
  pageSize: number;
  total: number;
  statusSummary: ParseJobStatusSummary;
  pendingSources: Array<{
    id: string;
    title: string;
    kind: "interview_experience" | "knowledge_note" | "resume";
    parseStatus:
      | "not_started"
      | "pending"
      | "running"
      | "needs_review"
      | "confirmed"
      | "failed";
    createdAt: string;
    updatedAt: string;
  }>;
};

type ReviewMergeTarget = {
  id: string;
  questionText: string;
  canonicalAnswer: string | null;
  category: string | null;
  sourceCount: number;
  reviewStatus: "draft" | "active" | "archived";
  tags: string[];
};

type ReviewJobDetail = {
  parseJob: ParseJobSummary;
  sourceDocument: {
    id: string;
    title: string;
    kind: "interview_experience" | "knowledge_note" | "resume" | "manual_input";
    rawText: string;
    parseStatus:
      | "not_started"
      | "pending"
      | "running"
      | "needs_review"
      | "confirmed"
      | "failed";
    createdAt: string;
    updatedAt: string;
  };
  result: ParseResult | null;
  mergeTargets: ReviewMergeTarget[];
};

type ConfirmParseJobResult = {
  parseJob: ParseJobSummary;
  importSummary: {
    createdQuestions: number;
    mergedQuestions: number;
    skippedQuestions: number;
    createdInterviewExperienceId: string | null;
  };
};

export class ParseReviewServiceError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "ParseReviewServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function trimNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeTagList(tags: string[] | undefined) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );
}

function deriveJobTypeForSource(
  kind: "interview_experience" | "knowledge_note" | "resume" | "manual_input",
) {
  switch (kind) {
    case "interview_experience":
    case "knowledge_note":
      return "extract_interview" as const;
    case "resume":
      return "extract_resume" as const;
    case "manual_input":
      return "normalize_manual_input" as const;
    default:
      return "extract_interview" as const;
  }
}

function ensureCompatibleJobType(
  sourceDocument: ReturnType<typeof sourceDocumentRepository.findById>,
  jobType: "extract_interview" | "extract_resume" | "normalize_manual_input",
) {
  if (!sourceDocument) {
    throw new ParseReviewServiceError(
      "not_found",
      "Source document was not found.",
      404,
    );
  }

  if (sourceDocument.kind === "manual_input") {
    throw new ParseReviewServiceError(
      "invalid_request",
      "Manual input already writes into canonical storage and does not create parse jobs.",
      409,
    );
  }

  const expectedJobType = deriveJobTypeForSource(sourceDocument.kind);

  if (jobType !== expectedJobType) {
    throw new ParseReviewServiceError(
      "invalid_request",
      `Job type ${jobType} is not compatible with source kind ${sourceDocument.kind}.`,
      400,
    );
  }
}

function toParseJobSummary(parseJob: {
  id: string;
  sourceDocumentId: string;
  jobType: "extract_interview" | "extract_resume" | "normalize_manual_input";
  provider: "openclaw";
  status: ParseJobStatus;
  attemptCount: number;
  errorMessage: string | null;
  resultJson: ParseResult | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}): ParseJobSummary {
  return {
    id: parseJob.id,
    source_document_id: parseJob.sourceDocumentId,
    job_type: parseJob.jobType,
    provider: parseJob.provider,
    status: parseJob.status,
    attempt_count: parseJob.attemptCount,
    error_message: parseJob.errorMessage,
    candidate_question_count: parseJob.resultJson?.questions.length ?? 0,
    created_at: parseJob.createdAt,
    updated_at: parseJob.updatedAt,
    started_at: parseJob.startedAt,
    finished_at: parseJob.finishedAt,
  };
}

function toParseJobListItem(parseJob: {
  id: string;
  sourceDocumentId: string;
  jobType: "extract_interview" | "extract_resume" | "normalize_manual_input";
  provider: "openclaw";
  status: ParseJobStatus;
  attemptCount: number;
  errorMessage: string | null;
  resultJson: ParseResult | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  sourceTitle: string;
  sourceKind: "interview_experience" | "knowledge_note" | "resume" | "manual_input";
  sourceParseStatus:
    | "not_started"
    | "pending"
    | "running"
    | "needs_review"
    | "confirmed"
    | "failed";
}): ParseJobListItem {
  return {
    ...toParseJobSummary(parseJob),
    source_title: parseJob.sourceTitle,
    source_kind: parseJob.sourceKind,
    source_parse_status: parseJob.sourceParseStatus,
  };
}

function buildStatusSummary(
  items: Array<{
    status: ParseJobStatus;
  }>,
): ParseJobStatusSummary {
  const summary: ParseJobStatusSummary = {
    pending: 0,
    running: 0,
    failed: 0,
    needs_review: 0,
    confirmed: 0,
  };

  for (const item of items) {
    if (item.status in summary) {
      summary[item.status as keyof ParseJobStatusSummary] += 1;
    }
  }

  return summary;
}

function attachMergeHints(result: ParseResult) {
  return {
    ...result,
    questions: result.questions.map((candidate) => {
      if (candidate.merge_hint_question_id) {
        return candidate;
      }

      const existingQuestion = questionRepository.findByNormalizedText(
        candidate.question_text,
      );

      return {
        ...candidate,
        merge_hint_question_id: existingQuestion?.id ?? null,
      };
    }),
  } satisfies ParseResult;
}

function buildSourceSnippet(
  question: {
    question_text: string;
    source_answer?: string | null;
    canonical_answer?: string | null;
  },
  sourceOrder: number,
) {
  const snippetParts = [`Question ${sourceOrder + 1}: ${question.question_text}`];

  if (question.source_answer) {
    snippetParts.push(`Source answer: ${question.source_answer}`);
  }

  if (
    question.canonical_answer &&
    question.canonical_answer !== question.source_answer
  ) {
    snippetParts.push(`Reviewed answer: ${question.canonical_answer}`);
  }

  return snippetParts.join("\n");
}

function hasInterviewExperienceValue(
  interviewExperience: ParseInterviewExperience | null | undefined,
) {
  if (!interviewExperience) {
    return false;
  }

  return Boolean(
    trimNullable(interviewExperience.company) ||
      trimNullable(interviewExperience.role) ||
      trimNullable(interviewExperience.round_info) ||
      trimNullable(interviewExperience.summary) ||
      normalizeTagList(interviewExperience.tags).length > 0,
  );
}

function createAnswerVariantIfMissing(
  questionItemId: string,
  content: string | null | undefined,
  variantType: "canonical" | "personal",
) {
  const normalizedContent = trimNullable(content);

  if (!normalizedContent) {
    return null;
  }

  const existingAnswerVariant = questionRepository
    .listAnswerVariants(questionItemId)
    .find((variant) => variant.content.trim() === normalizedContent);

  if (existingAnswerVariant) {
    return existingAnswerVariant;
  }

  return questionRepository.createAnswerVariant({
    questionItemId,
    variantType,
    content: normalizedContent,
    authorType: "ai",
  });
}

function buildMergeTarget(questionId: string) {
  const question = questionRepository.findById(questionId);

  if (!question) {
    return undefined;
  }

  return {
    id: question.id,
    questionText: question.questionText,
    canonicalAnswer: question.canonicalAnswer,
    category: question.category,
    sourceCount: question.sourceCount,
    reviewStatus: question.reviewStatus,
    tags: questionRepository.listTags(question.id).map((tag) => tag.name),
  } satisfies ReviewMergeTarget;
}

async function executeParseJob(jobId: string) {
  const existingJob = parseJobRepository.findById(jobId);

  if (!existingJob) {
    throw new ParseReviewServiceError("not_found", "Parse job was not found.", 404);
  }

  if (existingJob.status === "confirmed") {
    throw new ParseReviewServiceError(
      "invalid_state",
      "Confirmed parse jobs cannot be retried in the current slice.",
      409,
    );
  }

  const sourceDocument = sourceDocumentRepository.findById(existingJob.sourceDocumentId);

  ensureCompatibleJobType(sourceDocument, existingJob.jobType);

  parseJobRepository.update(jobId, {
    status: "running",
    attemptCount: existingJob.attemptCount + 1,
    errorMessage: null,
    resultJson: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  });
  sourceDocumentRepository.updateParseStatus(existingJob.sourceDocumentId, "running");

  try {
    const parseResult = attachMergeHints(
      await openClawParseSourceAdapter.parse({
        kind: sourceDocument.kind,
        title: sourceDocument.title,
        rawText: sourceDocument.rawText,
        jobType: existingJob.jobType,
      }),
    );
    const updatedJob = parseJobRepository.update(jobId, {
      status: "needs_review",
      errorMessage: null,
      resultJson: parseResult,
      finishedAt: new Date().toISOString(),
    });

    sourceDocumentRepository.updateParseStatus(
      existingJob.sourceDocumentId,
      "needs_review",
    );

    if (!updatedJob) {
      throw new ParseReviewServiceError(
        "not_found",
        "Parse job disappeared during execution.",
        404,
      );
    }

    return updatedJob;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Parse execution failed.";
    const failedJob = parseJobRepository.update(jobId, {
      status: "failed",
      errorMessage: message,
      finishedAt: new Date().toISOString(),
    });

    sourceDocumentRepository.updateParseStatus(existingJob.sourceDocumentId, "failed");

    if (!failedJob) {
      throw new ParseReviewServiceError(
        "not_found",
        "Parse job disappeared during failure handling.",
        404,
      );
    }

    return failedJob;
  }
}

export const parseReviewService = {
  async createParseJob(input: {
    sourceDocumentId: string;
    jobType: "extract_interview" | "extract_resume" | "normalize_manual_input";
  }) {
    const sourceDocument = sourceDocumentRepository.findById(input.sourceDocumentId);

    ensureCompatibleJobType(sourceDocument, input.jobType);

    const latestJob = parseJobRepository.findLatestBySourceDocumentId(
      input.sourceDocumentId,
    );

    if (latestJob) {
      if (
        latestJob.status === "pending" ||
        latestJob.status === "running" ||
        latestJob.status === "needs_review"
      ) {
        return toParseJobSummary(latestJob);
      }

      if (latestJob.status === "failed") {
        return toParseJobSummary(await executeParseJob(latestJob.id));
      }

      if (latestJob.status === "confirmed") {
        throw new ParseReviewServiceError(
          "invalid_state",
          "This source document has already been confirmed.",
          409,
        );
      }
    }

    const parseJob = parseJobRepository.create({
      sourceDocumentId: input.sourceDocumentId,
      jobType: input.jobType,
      status: "pending",
    });

    if (!parseJob) {
      throw new ParseReviewServiceError(
        "internal_error",
        "Failed to create parse job.",
        500,
      );
    }

    sourceDocumentRepository.updateParseStatus(input.sourceDocumentId, "pending");

    return toParseJobSummary(await executeParseJob(parseJob.id));
  },

  async retryParseJob(jobId: string) {
    return toParseJobSummary(await executeParseJob(jobId));
  },

  listReviewQueue(filters: ReviewQueueFilters = {}): ReviewQueueData {
    const jobs = parseJobRepository.list({
      status: filters.status,
      sourceKind: filters.kind,
      query: filters.query,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
    });
    const summaryBase = parseJobRepository.listAll({
      sourceKind: filters.kind,
      query: filters.query,
    });
    const pendingSources = sourceDocumentRepository
      .list({
        kind: filters.kind,
        query: filters.query,
        parseStatus: "not_started",
        page: 1,
        pageSize: 12,
      })
      .items.filter(
        (sourceDocument): sourceDocument is SourceDocumentRecord & {
          kind: "interview_experience" | "knowledge_note" | "resume";
        } => sourceDocument.kind !== "manual_input",
      );

    return {
      items: jobs.items.map(toParseJobListItem),
      page: jobs.page,
      pageSize: jobs.pageSize,
      total: jobs.total,
      statusSummary: buildStatusSummary(summaryBase),
      pendingSources: pendingSources.map((sourceDocument) => ({
        id: sourceDocument.id,
        title: sourceDocument.title,
        kind: sourceDocument.kind,
        parseStatus: sourceDocument.parseStatus,
        createdAt: sourceDocument.createdAt,
        updatedAt: sourceDocument.updatedAt,
      })),
    };
  },

  getParseJobSummary(jobId: string) {
    const parseJob = parseJobRepository.findById(jobId);

    if (!parseJob) {
      return undefined;
    }

    return toParseJobSummary(parseJob);
  },

  getParseJobResult(jobId: string) {
    return parseJobRepository.findById(jobId)?.resultJson ?? null;
  },

  getReviewJobDetail(jobId: string): ReviewJobDetail | undefined {
    const parseJob = parseJobRepository.findById(jobId);

    if (!parseJob) {
      return undefined;
    }

    const sourceDocument = sourceDocumentRepository.findById(parseJob.sourceDocumentId);

    if (!sourceDocument) {
      return undefined;
    }

    const mergeTargetIds = Array.from(
      new Set(
        (parseJob.resultJson?.questions ?? [])
          .map((question) => question.merge_hint_question_id)
          .filter((questionId): questionId is string => Boolean(questionId)),
      ),
    );

    return {
      parseJob: toParseJobSummary(parseJob),
      sourceDocument: {
        id: sourceDocument.id,
        title: sourceDocument.title,
        kind: sourceDocument.kind,
        rawText: sourceDocument.rawText,
        parseStatus: sourceDocument.parseStatus,
        createdAt: sourceDocument.createdAt,
        updatedAt: sourceDocument.updatedAt,
      },
      result: parseJob.resultJson,
      mergeTargets: mergeTargetIds
        .map(buildMergeTarget)
        .filter((target): target is ReviewMergeTarget => target !== undefined),
    };
  },

  confirmParseJob(jobId: string, input: ConfirmParseJobRequest): ConfirmParseJobResult {
    const parseJob = parseJobRepository.findById(jobId);

    if (!parseJob) {
      throw new ParseReviewServiceError("not_found", "Parse job was not found.", 404);
    }

    if (parseJob.jobType !== "extract_interview") {
      throw new ParseReviewServiceError(
        "not_supported",
        "Resume or manual-input confirmation is deferred to a later slice.",
        409,
      );
    }

    if (parseJob.status === "confirmed") {
      throw new ParseReviewServiceError(
        "invalid_state",
        "This parse job has already been confirmed.",
        409,
      );
    }

    if (!parseJob.resultJson) {
      throw new ParseReviewServiceError(
        "invalid_state",
        "Parse result is not ready for confirmation.",
        409,
      );
    }

    const sourceDocument = sourceDocumentRepository.findById(parseJob.sourceDocumentId);

    if (!sourceDocument) {
      throw new ParseReviewServiceError(
        "not_found",
        "Source document was not found.",
        404,
      );
    }

    return sqlite.transaction(() => {
      let createdQuestions = 0;
      let mergedQuestions = 0;
      let skippedQuestions = 0;
      let createdInterviewExperienceId: string | null = null;

      if (hasInterviewExperienceValue(input.interview_experience)) {
        const interviewExperience = interviewExperienceRepository.upsertBySourceDocumentId({
          sourceDocumentId: sourceDocument.id,
          company: trimNullable(input.interview_experience?.company),
          role: trimNullable(input.interview_experience?.role),
          roundInfo: trimNullable(input.interview_experience?.round_info),
          summary: trimNullable(input.interview_experience?.summary),
        });

        interviewExperienceRepository.replaceTags(
          interviewExperience.id,
          normalizeTagList(input.interview_experience?.tags),
        );
        createdInterviewExperienceId = interviewExperience.id;
      }

      input.questions.forEach((question, index) => {
        if (question.action === "skip") {
          skippedQuestions += 1;
          return;
        }

        const canonicalAnswer = trimNullable(question.canonical_answer);
        const sourceAnswer = trimNullable(question.source_answer);
        const category = trimNullable(question.category);
        const tags = normalizeTagList(question.tags);

        if (question.action === "create") {
          const existingQuestion = questionRepository.findByNormalizedText(
            question.question_text,
          );

          if (existingQuestion) {
            throw new ParseReviewServiceError(
              "conflict",
              `Question "${question.question_text}" already exists. Switch the decision to merge or edit the text first.`,
              409,
            );
          }

          const createdQuestion = questionRepository.create({
            questionText: question.question_text,
            canonicalAnswer,
            category,
            reviewStatus: "active",
            createdFrom: "ai_parse",
          });

          questionRepository.replaceTags(createdQuestion.id, tags);
          createAnswerVariantIfMissing(
            createdQuestion.id,
            canonicalAnswer,
            "canonical",
          );
          createAnswerVariantIfMissing(createdQuestion.id, sourceAnswer, "personal");
          questionRepository.createSourceQuestionRef({
            sourceDocumentId: sourceDocument.id,
            questionItemId: createdQuestion.id,
            sourceSnippet: buildSourceSnippet(question, index),
            sourceOrder: index,
          });
          createdQuestions += 1;
          return;
        }

        const targetQuestion = questionRepository.findById(question.target_question_id);

        if (!targetQuestion) {
          throw new ParseReviewServiceError(
            "not_found",
            `Target question ${question.target_question_id} was not found.`,
            404,
          );
        }

        questionRepository.update(targetQuestion.id, {
          canonicalAnswer: targetQuestion.canonicalAnswer ?? canonicalAnswer,
          category: targetQuestion.category ?? category,
          reviewStatus:
            targetQuestion.reviewStatus === "draft" ? "active" : targetQuestion.reviewStatus,
        });

        const mergedTags = [
          ...questionRepository.listTags(targetQuestion.id).map((tag) => tag.name),
          ...tags,
        ];

        questionRepository.replaceTags(targetQuestion.id, mergedTags);
        createAnswerVariantIfMissing(targetQuestion.id, canonicalAnswer, "canonical");
        createAnswerVariantIfMissing(targetQuestion.id, sourceAnswer, "personal");
        questionRepository.createSourceQuestionRef({
          sourceDocumentId: sourceDocument.id,
          questionItemId: targetQuestion.id,
          sourceSnippet: buildSourceSnippet(question, index),
          sourceOrder: index,
        });
        mergedQuestions += 1;
      });

      const confirmedJob = parseJobRepository.update(jobId, {
        status: "confirmed",
        finishedAt: new Date().toISOString(),
      });

      sourceDocumentRepository.updateParseStatus(sourceDocument.id, "confirmed");

      if (!confirmedJob) {
        throw new ParseReviewServiceError(
          "not_found",
          "Parse job disappeared during confirmation.",
          404,
        );
      }

      return {
        parseJob: toParseJobSummary(confirmedJob),
        importSummary: {
          createdQuestions,
          mergedQuestions,
          skippedQuestions,
          createdInterviewExperienceId,
        },
      };
    })();
  },
};

export type { ReviewJobDetail, ReviewMergeTarget, ReviewQueueData };
