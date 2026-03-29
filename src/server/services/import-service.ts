import type { ParseJobSummary } from "@/lib/schemas/parse-jobs";
import type { UploadSourceSubmitMode } from "@/lib/schemas/import";
import { sqlite } from "@/server/db/client";
import {
  questionRepository,
  sourceDocumentRepository,
  tagRepository,
} from "@/server/repositories";
import { createOpaqueId } from "@/server/repositories/ids";
import type { SourceDocumentRecord } from "@/server/repositories/source-document-repository";
import { fileStorageService } from "@/server/services/file-storage-service";
import { fileTextExtractionService } from "@/server/services/file-text-extraction-service";
import { ImportServiceError } from "@/server/services/import-service-error";
import { parseReviewService } from "@/server/services/parse-review-service";

type CreateTextSourceInput = {
  title: string;
  kind: "interview_experience" | "knowledge_note" | "resume";
  rawText: string;
  sourceUrl?: string | null;
};

type CreateUploadedSourceInput = {
  title?: string | null;
  kind: "interview_experience" | "knowledge_note" | "resume";
  sourceUrl?: string | null;
  fileName: string;
  mimeType?: string | null;
  fileBuffer: Buffer;
};

type CreateManualQaInput = {
  questionText: string;
  answerText: string;
  categories: string[];
  tags: string[];
};

type ListSourcesInput = {
  kind?: SourceDocumentRecord["kind"];
  parseStatus?: SourceDocumentRecord["parseStatus"];
  query?: string;
  page?: number;
  pageSize?: number;
};

type SubmitUploadedSourceInput = CreateUploadedSourceInput & {
  submitMode: UploadSourceSubmitMode;
};

export type ManualQaOptions = {
  categories: string[];
  tags: string[];
};

const defaultManualQaCategories = [
  "distributed_system",
  "database",
  "java_concurrency",
  "java_jvm",
  "backend_framework",
  "networking",
  "system_design",
];

const defaultManualQaTags = [
  "redis",
  "mq",
  "mysql",
  "threadlocal",
  "concurrency",
  "jvm",
  "spring",
  "network",
  "design",
];

function mergeSeededValues(defaultValues: string[], persistedValues: string[]) {
  return Array.from(
    new Map(
      [...defaultValues, ...persistedValues]
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value) => [value.toLowerCase(), value]),
    ).values(),
  );
}

function trimNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function buildManualSourceTitle(questionText: string) {
  const compactQuestion = questionText.replace(/\s+/g, " ").trim();

  if (compactQuestion.length <= 56) {
    return `Manual Q&A - ${compactQuestion}`;
  }

  return `Manual Q&A - ${compactQuestion.slice(0, 53).trimEnd()}...`;
}

function buildManualSourceRawText(input: CreateManualQaInput) {
  const lines = [
    `Question: ${input.questionText}`,
    "",
    `Answer: ${input.answerText}`,
  ];

  if (input.categories.length > 0) {
    lines.push("", `Categories: ${input.categories.join(", ")}`);
  }

  if (input.tags.length > 0) {
    lines.push("", `Tags: ${input.tags.join(", ")}`);
  }

  return lines.join("\n");
}

function buildManualSourceSnippet(input: CreateManualQaInput) {
  return `Question: ${input.questionText}\nAnswer: ${input.answerText}`;
}

function mergeQuestionTags(questionItemId: string, tags: string[]) {
  if (tags.length === 0) {
    return [];
  }

  const existingTagNames = questionRepository
    .listTags(questionItemId)
    .map((tag) => tag.name);

  return questionRepository.replaceTags(questionItemId, [...existingTagNames, ...tags]);
}

function mergeQuestionCategories(questionItemId: string, categories: string[]) {
  if (categories.length === 0) {
    return [];
  }

  const questionItem = questionRepository.findById(questionItemId);
  const existingCategoryNames = [
    ...(questionItem?.category ? [questionItem.category] : []),
    ...questionRepository
      .listQuestionCategories(questionItemId)
      .map((category) => category.name),
  ];

  return questionRepository.replaceCategories(questionItemId, [
    ...existingCategoryNames,
    ...categories,
  ]);
}

function deriveParseJobTypeForUploadedSource(
  kind: SubmitUploadedSourceInput["kind"],
) {
  return kind === "resume" ? "extract_resume" : "extract_interview";
}

export const importService = {
  createTextSource(input: CreateTextSourceInput) {
    return sourceDocumentRepository.create({
      kind: input.kind,
      title: input.title,
      rawText: input.rawText,
      sourceUrl: input.sourceUrl ?? null,
    });
  },

  async createUploadedSource(input: CreateUploadedSourceInput) {
    const sourceId = createOpaqueId("src");
    const trimmedFileName = input.fileName.trim();

    if (trimmedFileName.length === 0) {
      throw new ImportServiceError(
        "invalid_request",
        "Uploaded file must include a file name.",
        400,
      );
    }

    let storedFile: Awaited<ReturnType<typeof fileStorageService.saveUploadedFile>> | null =
      null;

    try {
      storedFile = await fileStorageService.saveUploadedFile({
        sourceDocumentId: sourceId,
        fileName: trimmedFileName,
        mimeType: input.mimeType ?? null,
        fileBuffer: input.fileBuffer,
      });

      const rawText = await fileTextExtractionService.extractTextFromFile({
        absoluteFilePath: storedFile.absoluteFilePath,
        extension: storedFile.extension,
      });

      return sourceDocumentRepository.create({
        id: sourceId,
        kind: input.kind,
        title: trimNullable(input.title) ?? trimmedFileName,
        rawText,
        fileName: trimmedFileName,
        mimeType: storedFile.mimeType,
        filePath: storedFile.filePath,
        sourceUrl: trimNullable(input.sourceUrl),
      });
    } catch (error) {
      if (storedFile) {
        await fileStorageService.deleteStoredFile(storedFile.filePath).catch(() => undefined);
      }

      if (error instanceof ImportServiceError) {
        throw error;
      }

      throw new ImportServiceError(
        "internal_error",
        "Failed to create an uploaded source document.",
        500,
      );
    }
  },

  async submitUploadedSource(input: SubmitUploadedSourceInput): Promise<{
    sourceDocument: SourceDocumentRecord;
    parseJob: ParseJobSummary | null;
  }> {
    const sourceDocument = await this.createUploadedSource(input);

    if (input.submitMode === "save_only") {
      return {
        sourceDocument,
        parseJob: null,
      };
    }

    const parseJob = await parseReviewService.createParseJob({
      sourceDocumentId: sourceDocument.id,
      jobType: deriveParseJobTypeForUploadedSource(input.kind),
    });
    const refreshedSourceDocument = sourceDocumentRepository.findById(sourceDocument.id);

    if (!refreshedSourceDocument) {
      throw new ImportServiceError(
        "internal_error",
        "Uploaded source document disappeared after parse job creation.",
        500,
      );
    }

    return {
      sourceDocument: refreshedSourceDocument,
      parseJob,
    };
  },

  createManualQa(input: CreateManualQaInput) {
    return sqlite.transaction(() => {
      const primaryCategory = input.categories[0] ?? null;
      const sourceDocument = sourceDocumentRepository.create({
        kind: "manual_input",
        title: buildManualSourceTitle(input.questionText),
        rawText: buildManualSourceRawText(input),
        parseStatus: "confirmed",
      });

      let questionItem = questionRepository.findByNormalizedText(input.questionText);

      if (!questionItem) {
        questionItem = questionRepository.create({
          questionText: input.questionText,
          canonicalAnswer: input.answerText,
          category: primaryCategory,
          reviewStatus: "active",
          createdFrom: "manual",
        });
      } else {
        questionItem =
          questionRepository.update(questionItem.id, {
            canonicalAnswer: input.answerText,
            ...(questionItem.category || !primaryCategory
              ? {}
              : { category: primaryCategory }),
            ...(questionItem.reviewStatus === "draft"
              ? { reviewStatus: "active" as const }
              : {}),
          }) ?? questionItem;
      }

      const existingAnswerVariant = questionRepository
        .listAnswerVariants(questionItem.id)
        .find((variant) => variant.content.trim() === input.answerText);

      const answerVariant =
        existingAnswerVariant ??
        questionRepository.createAnswerVariant({
          questionItemId: questionItem.id,
          variantType: "canonical",
          content: input.answerText,
          authorType: "user",
        });

      questionRepository.createSourceQuestionRef({
        sourceDocumentId: sourceDocument.id,
        questionItemId: questionItem.id,
        sourceSnippet: buildManualSourceSnippet(input),
      });

      mergeQuestionCategories(questionItem.id, input.categories);
      mergeQuestionTags(questionItem.id, input.tags);

      return {
        sourceDocument,
        questionItem,
        answerVariant,
      };
    })();
  },

  listSources(input: ListSourcesInput = {}) {
    return sourceDocumentRepository.list({
      kind: input.kind,
      parseStatus: input.parseStatus,
      query: input.query,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 10,
    });
  },

  listRecentSources(limit = 8) {
    return sourceDocumentRepository.listRecent(limit);
  },

  getManualQaOptions(): ManualQaOptions {
    return {
      categories: mergeSeededValues(
        defaultManualQaCategories,
        questionRepository.listCategories(40),
      ),
      tags: mergeSeededValues(defaultManualQaTags, tagRepository.listNames(80)),
    };
  },
};
