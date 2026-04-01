import type { ConfirmParseJobRequest } from "@/lib/schemas/parse-jobs";
import {
  interviewExperienceRepository,
  interviewQuestionRepository,
  questionRepository,
} from "@/server/repositories";
import type { SourceDocumentRecord } from "@/server/repositories/source-document-repository";

import { ParseReviewServiceError } from "./parse-review-errors";

/**
 * [POS] 承载 parse review 确认导入时的局部写入规则，区分知识笔记入题库与面经入面经题。
 * [IN] source kind、审核后的候选题、来源文档 id、可选的面经元信息。
 * [OUT] 写入 interview_experience / interview_question / question_item / source_question_ref 等结构化实体。
 *
 * @feature open-interview-review-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

export function trimNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function normalizeTagList(tags: string[] | undefined) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );
}

function buildSourceSnippet(
  question: {
    question_text: string;
    answer?: string | null;
    source_answer?: string | null;
    canonical_answer?: string | null;
  },
  sourceOrder: number,
) {
  const snippetParts = [`Question ${sourceOrder + 1}: ${question.question_text}`];
  const primaryAnswer = resolvePrimaryAnswer(question);

  if (primaryAnswer) {
    snippetParts.push(`Answer: ${primaryAnswer}`);
  }

  return snippetParts.join("\n");
}

function createAnswerVariantIfMissing(
  questionItemId: string,
  content: string | null | undefined,
  variantType: "canonical",
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

export function resolvePrimaryAnswer(question: {
  answer?: string | null;
  source_answer?: string | null;
  canonical_answer?: string | null;
}) {
  return (
    trimNullable(question.answer) ??
    trimNullable(question.source_answer) ?? trimNullable(question.canonical_answer)
  );
}

export function upsertInterviewExperienceForSource(input: {
  sourceDocumentId: string;
  sourceKind: SourceDocumentRecord["kind"];
  interviewExperience: ConfirmParseJobRequest["interview_experience"];
}) {
  if (input.sourceKind !== "interview_experience") {
    return null;
  }

  const interviewExperience = interviewExperienceRepository.upsertBySourceDocumentId({
    sourceDocumentId: input.sourceDocumentId,
    company: trimNullable(input.interviewExperience?.company),
    role: trimNullable(input.interviewExperience?.role),
    roundInfo: trimNullable(input.interviewExperience?.round_info),
    summary: trimNullable(input.interviewExperience?.summary),
  });

  interviewExperienceRepository.replaceTags(
    interviewExperience.id,
    normalizeTagList(input.interviewExperience?.tags),
  );

  return interviewExperience.id;
}

export function confirmCanonicalQuestionWrite(input: {
  sourceDocumentId: string;
  question: ConfirmParseJobRequest["questions"][number];
  index: number;
  counters: {
    createdQuestions: number;
    mergedQuestions: number;
    skippedQuestions: number;
  };
}) {
  const { question } = input;

  if (question.action === "skip") {
    input.counters.skippedQuestions += 1;
    return;
  }

  if (question.action === "keep") {
    throw new ParseReviewServiceError(
      "invalid_request",
      "Knowledge-note confirmation does not support keep action.",
      400,
    );
  }

  const primaryAnswer = resolvePrimaryAnswer(question);
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
      canonicalAnswer: primaryAnswer,
      category,
      reviewStatus: "active",
      createdFrom: "ai_parse",
    });

    questionRepository.replaceTags(createdQuestion.id, tags);
    createAnswerVariantIfMissing(
      createdQuestion.id,
      primaryAnswer,
      "canonical",
    );
    questionRepository.createSourceQuestionRef({
      sourceDocumentId: input.sourceDocumentId,
      questionItemId: createdQuestion.id,
      sourceSnippet: buildSourceSnippet(question, input.index),
      sourceOrder: input.index,
    });
    input.counters.createdQuestions += 1;
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
    canonicalAnswer: primaryAnswer ?? targetQuestion.canonicalAnswer,
    category: targetQuestion.category ?? category,
    reviewStatus:
      targetQuestion.reviewStatus === "draft" ? "active" : targetQuestion.reviewStatus,
  });

  const mergedTags = [
    ...questionRepository.listTags(targetQuestion.id).map((tag) => tag.name),
    ...tags,
  ];

  questionRepository.replaceTags(targetQuestion.id, mergedTags);
  createAnswerVariantIfMissing(targetQuestion.id, primaryAnswer, "canonical");
  questionRepository.createSourceQuestionRef({
    sourceDocumentId: input.sourceDocumentId,
    questionItemId: targetQuestion.id,
    sourceSnippet: buildSourceSnippet(question, input.index),
    sourceOrder: input.index,
  });
  input.counters.mergedQuestions += 1;
}

export function confirmInterviewQuestionWrite(input: {
  interviewExperienceId: string;
  sourceDocumentId: string;
  question: ConfirmParseJobRequest["questions"][number];
  index: number;
  counters: {
    keptInterviewQuestions: number;
    skippedQuestions: number;
  };
}) {
  const { question } = input;

  if (question.action === "skip") {
    input.counters.skippedQuestions += 1;
    return;
  }

  if (question.action !== "keep") {
    throw new ParseReviewServiceError(
      "invalid_request",
      "Interview confirmation only supports keep or skip actions.",
      400,
    );
  }

  const createdInterviewQuestion = interviewQuestionRepository.create({
    interviewExperienceId: input.interviewExperienceId,
    sourceDocumentId: input.sourceDocumentId,
    questionText: question.question_text,
    sourceAnswer: resolvePrimaryAnswer(question),
    sourceSnippet: buildSourceSnippet(question, input.index),
    sourceOrder: input.index,
    category: trimNullable(question.category),
  });

  interviewQuestionRepository.replaceTags(
    createdInterviewQuestion.id,
    normalizeTagList(question.tags),
  );
  input.counters.keptInterviewQuestions += 1;
}
