import type { InterviewQuestionPromoteRequest } from "@/lib/schemas/interview-questions";
import { sqlite } from "@/server/db/client";
import {
  interviewQuestionRepository,
  questionRepository,
} from "@/server/repositories";

/**
 * [POS] 编排面经题与题库题之间的推荐与手动沉淀动作。
 * [IN] interview question id、沉淀动作和可选的目标题库题 id。
 * [OUT] 创建或合并题库题、补来源引用，并记录面经题到题库题的正式关联。
 *
 * @feature open-interview-interviews-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

import { BaseServiceError } from "@/server/api/base-service-error";

export class InterviewQuestionServiceError extends BaseServiceError {}

function trimNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function buildSourceSnippet(input: {
  questionText: string;
  sourceAnswer: string | null;
  sourceSnippet: string | null;
}) {
  if (input.sourceSnippet) {
    return input.sourceSnippet;
  }

  const snippetParts = [`Question: ${input.questionText}`];

  if (input.sourceAnswer) {
    snippetParts.push(`Answer: ${input.sourceAnswer}`);
  }

  return snippetParts.join("\n");
}

function createCanonicalAnswerVariantIfMissing(
  questionItemId: string,
  content: string | null,
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
    variantType: "canonical",
    content: normalizedContent,
    authorType: "ai",
  });
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

function mergeQuestionCategories(questionItemId: string, category: string | null) {
  const normalizedCategory = trimNullable(category);

  if (!normalizedCategory) {
    return [];
  }

  const questionItem = questionRepository.findById(questionItemId);
  const existingCategoryNames = [
    ...(questionItem?.category ? [questionItem.category] : []),
    ...questionRepository
      .listQuestionCategories(questionItemId)
      .map((existingCategory) => existingCategory.name),
  ];

  return questionRepository.replaceCategories(questionItemId, [
    ...existingCategoryNames,
    normalizedCategory,
  ]);
}

export const interviewQuestionService = {
  promoteInterviewQuestion(
    interviewQuestionId: string,
    input: InterviewQuestionPromoteRequest,
  ) {
    const interviewQuestion = interviewQuestionRepository.findById(interviewQuestionId);

    if (!interviewQuestion) {
      throw new InterviewQuestionServiceError(
        "not_found",
        "Interview question was not found.",
        404,
      );
    }

    const interviewQuestionTags = interviewQuestionRepository
      .listTags(interviewQuestionId)
      .map((tag) => tag.name);
    const existingLinks = interviewQuestionRepository.listLinks(interviewQuestionId);

    return sqlite.transaction(() => {
      if (input.action === "create") {
        const existingCreatedLink = existingLinks.find(
          (link) => link.linkType === "promoted_create",
        );

        if (existingCreatedLink) {
          return {
            interviewQuestionId,
            questionItemId: existingCreatedLink.questionItemId,
            questionText: existingCreatedLink.questionText,
            linkType: existingCreatedLink.linkType,
          };
        }

        const existingQuestion = questionRepository.findByNormalizedText(
          interviewQuestion.questionText,
        );

        if (existingQuestion) {
          throw new InterviewQuestionServiceError(
            "conflict",
            `Question "${interviewQuestion.questionText}" already exists in the bank. Use merge instead.`,
            409,
          );
        }

        const createdQuestion = questionRepository.create({
          questionText: interviewQuestion.questionText,
          canonicalAnswer: interviewQuestion.sourceAnswer,
          category: interviewQuestion.category,
          reviewStatus: "active",
          createdFrom: "ai_parse",
        });

        questionRepository.replaceTags(createdQuestion.id, interviewQuestionTags);
        mergeQuestionCategories(createdQuestion.id, interviewQuestion.category);
        createCanonicalAnswerVariantIfMissing(
          createdQuestion.id,
          interviewQuestion.sourceAnswer,
        );
        questionRepository.createSourceQuestionRef({
          sourceDocumentId: interviewQuestion.sourceDocumentId,
          questionItemId: createdQuestion.id,
          sourceSnippet: buildSourceSnippet({
            questionText: interviewQuestion.questionText,
            sourceAnswer: interviewQuestion.sourceAnswer,
            sourceSnippet: interviewQuestion.sourceSnippet,
          }),
          sourceOrder: interviewQuestion.sourceOrder,
        });
        interviewQuestionRepository.createLink({
          interviewQuestionId,
          questionItemId: createdQuestion.id,
          linkType: "promoted_create",
        });

        return {
          interviewQuestionId,
          questionItemId: createdQuestion.id,
          questionText: createdQuestion.questionText,
          linkType: "promoted_create" as const,
        };
      }

      const targetQuestion = questionRepository.findById(input.target_question_id);

      if (!targetQuestion) {
        throw new InterviewQuestionServiceError(
          "not_found",
          `Target question ${input.target_question_id} was not found.`,
          404,
        );
      }

      const existingMergedLink = existingLinks.find(
        (link) =>
          link.linkType === "promoted_merge" &&
          link.questionItemId === targetQuestion.id,
      );

      if (existingMergedLink) {
        return {
          interviewQuestionId,
          questionItemId: existingMergedLink.questionItemId,
          questionText: existingMergedLink.questionText,
          linkType: existingMergedLink.linkType,
        };
      }

      questionRepository.update(targetQuestion.id, {
        canonicalAnswer:
          targetQuestion.canonicalAnswer ?? interviewQuestion.sourceAnswer,
        category: targetQuestion.category ?? interviewQuestion.category,
        reviewStatus:
          targetQuestion.reviewStatus === "draft" ? "active" : targetQuestion.reviewStatus,
      });
      mergeQuestionTags(targetQuestion.id, interviewQuestionTags);
      mergeQuestionCategories(targetQuestion.id, interviewQuestion.category);
      createCanonicalAnswerVariantIfMissing(
        targetQuestion.id,
        targetQuestion.canonicalAnswer ? null : interviewQuestion.sourceAnswer,
      );
      questionRepository.createSourceQuestionRef({
        sourceDocumentId: interviewQuestion.sourceDocumentId,
        questionItemId: targetQuestion.id,
        sourceSnippet: buildSourceSnippet({
          questionText: interviewQuestion.questionText,
          sourceAnswer: interviewQuestion.sourceAnswer,
          sourceSnippet: interviewQuestion.sourceSnippet,
        }),
        sourceOrder: interviewQuestion.sourceOrder,
      });
      interviewQuestionRepository.createLink({
        interviewQuestionId,
        questionItemId: targetQuestion.id,
        linkType: "promoted_merge",
      });

      return {
        interviewQuestionId,
        questionItemId: targetQuestion.id,
        questionText: targetQuestion.questionText,
        linkType: "promoted_merge" as const,
      };
    })();
  },
};
