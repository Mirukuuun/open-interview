import { sqlite } from "@/server/db/client";
import {
  questionRepository,
  sourceDocumentRepository,
  tagRepository,
} from "@/server/repositories";
import type { SourceDocumentRecord } from "@/server/repositories/source-document-repository";

type CreateTextSourceInput = {
  title: string;
  kind: "interview_experience" | "knowledge_note" | "resume";
  rawText: string;
  sourceUrl?: string | null;
};

type CreateManualQaInput = {
  questionText: string;
  answerText: string;
  category?: string | null;
  tags: string[];
};

type ListSourcesInput = {
  kind?: SourceDocumentRecord["kind"];
  parseStatus?: SourceDocumentRecord["parseStatus"];
  query?: string;
  page?: number;
  pageSize?: number;
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

  if (input.category) {
    lines.push("", `Category: ${input.category}`);
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

function pickManualAnswerVariantType(
  canonicalAnswer: string | null,
  answerText: string,
) {
  if (!canonicalAnswer || canonicalAnswer === answerText) {
    return "canonical" as const;
  }

  return "personal" as const;
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

  createManualQa(input: CreateManualQaInput) {
    return sqlite.transaction(() => {
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
          category: input.category ?? null,
          reviewStatus: "active",
          createdFrom: "manual",
        });
      } else {
        questionItem =
          questionRepository.update(questionItem.id, {
            ...(questionItem.canonicalAnswer
              ? {}
              : { canonicalAnswer: input.answerText }),
            ...(questionItem.category || !input.category
              ? {}
              : { category: input.category }),
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
          variantType: pickManualAnswerVariantType(
            questionItem.canonicalAnswer,
            input.answerText,
          ),
          content: input.answerText,
          authorType: "user",
        });

      questionRepository.createSourceQuestionRef({
        sourceDocumentId: sourceDocument.id,
        questionItemId: questionItem.id,
        sourceSnippet: buildManualSourceSnippet(input),
      });

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
