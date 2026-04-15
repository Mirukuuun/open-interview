import {
  assessmentItemSchema,
  assessmentResultSummarySchema,
  assessmentResultSummaryV2Schema,
  assessmentSessionSchema,
  practiceProfileDimensionSchema,
  practiceProfileSchema,
  practiceRecentExamSchema,
  practiceQuestionSchema,
  submitAssessmentSessionRequestSchema,
} from "@/lib/schemas/practice";
import {
  getPracticeDimensionLabel,
  type PracticeDimensionKey,
} from "@/lib/practice-dimensions";
import { assessmentRepository } from "@/server/repositories/assessment-repository";
import { practiceProfileRepository } from "@/server/repositories/practice-profile-repository";
import { nowUtcIso } from "@/server/repositories/ids";
import { questionBankService } from "@/server/services/question-bank-service";
import {
  resolvePracticeDimensionKey,
  resolvePracticeDimensionWeights,
} from "@/server/services/practice-dimension-config";
import { gradeAssessmentBatch } from "@/server/services/practice-grading";
import { z } from "zod";

/**
 * [POS] 编排随机练习与模拟考试能力：题池读取、考试创建、答案提交、评分汇总与最近记录读取。
 * [IN] 随机练习页面加载、考试创建参数、考试答案提交等业务边界输入。
 * [OUT] 返回 practice 题池、考试 session/item、评分结果摘要与最近考试记录。
 *
 * @feature open-interview-practice-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

import { BaseServiceError } from "@/server/api/base-service-error";

export class PracticeServiceError extends BaseServiceError {}

function shuffleArray<T>(items: T[]) {
  const copiedItems = [...items];

  for (let index = copiedItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = copiedItems[index];

    copiedItems[index] = copiedItems[randomIndex] as T;
    copiedItems[randomIndex] = currentValue as T;
  }

  return copiedItems;
}

function filterPracticeQuestionsByDimension(
  questions: ReturnType<typeof questionBankService.listPracticePool>,
  dimension: PracticeDimensionKey | undefined,
) {
  if (!dimension) {
    return questions;
  }

  return questions.filter((question) =>
    resolvePracticeDimensionWeights({
      category: question.category,
      tags: question.tags,
    }).some((weight) => weight.key === dimension),
  );
}

function normalizeRecentExamWeakAreas(
  weakAreas: ReturnType<typeof assessmentRepository.listRecentCompleted>[number]["weakAreas"],
) {
  const normalizedAreas = new Map<
    PracticeDimensionKey,
    {
      key: PracticeDimensionKey;
      label: string;
      average_score: number;
    }
  >();

  weakAreas.forEach((area) => {
    const resolvedKey =
      resolvePracticeDimensionKey(area.key) ?? resolvePracticeDimensionKey(area.label);

    if (!resolvedKey) {
      return;
    }

    const normalizedArea = {
      key: resolvedKey,
      label: getPracticeDimensionLabel(resolvedKey),
      average_score: area.averageScore,
    };
    const existingArea = normalizedAreas.get(resolvedKey);

    if (!existingArea || normalizedArea.average_score < existingArea.average_score) {
      normalizedAreas.set(resolvedKey, normalizedArea);
    }
  });

  return Array.from(normalizedAreas.values()).sort(
    (left, right) => left.average_score - right.average_score,
  );
}

function toApiAssessmentSession(
  session: NonNullable<ReturnType<typeof assessmentRepository.findById>>,
) {
  return assessmentSessionSchema.parse({
    id: session.id,
    mode: session.mode,
    status: session.status,
    question_count: session.questionCount,
    total_score: session.totalScore,
    max_score: session.maxScore,
    started_at: session.startedAt,
    submitted_at: session.submittedAt,
    completed_at: session.completedAt,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  });
}

function toApiAssessmentItem(
  item: NonNullable<ReturnType<typeof assessmentRepository.findById>>["items"][number],
) {
  return assessmentItemSchema.parse({
    id: item.id,
    sequence_no: item.sequenceNo,
    question_item_id: item.questionItemId,
    question_text: item.questionTextSnapshot,
    canonical_answer: item.canonicalAnswerSnapshot,
    category: item.categorySnapshot,
    difficulty: item.difficultySnapshot,
    tags: item.tags,
    dimension_weights: item.dimensionWeights,
    user_answer: item.userAnswer,
    score: item.score,
    max_score: item.maxScore,
    feedback: item.feedback ?? undefined,
    skill_scores: item.skillScores ?? undefined,
  });
}

function toApiAssessmentDetail(
  session: NonNullable<ReturnType<typeof assessmentRepository.findById>>,
) {
  return {
    assessment_session: toApiAssessmentSession(session),
    items: session.items.map(toApiAssessmentItem),
    result_summary: session.summary
      ? assessmentResultSummarySchema.parse(session.summary)
      : null,
  };
}

function toApiPracticeProfile() {
  const profileBundle = practiceProfileRepository.getDefaultProfile();

  if (!profileBundle) {
    throw new PracticeServiceError(
      "internal_error",
      "读取长期能力画像失败。",
      500,
    );
  }

  return {
    profile: practiceProfileSchema.parse({
      id: profileBundle.profile.id,
      scope: profileBundle.profile.scope,
      dimension_catalog_version: profileBundle.profile.dimensionCatalogVersion,
      last_exam_session_id: profileBundle.profile.lastExamSessionId,
      last_assessed_at: profileBundle.profile.lastAssessedAt,
    }),
    dimensions: profileBundle.dimensions.map((dimension) =>
      practiceProfileDimensionSchema.parse({
        key: dimension.key,
        label: dimension.label,
        score: dimension.score,
        evidence_count: dimension.evidenceCount,
        last_exam_score: dimension.lastExamScore,
        last_assessed_at: dimension.lastAssessedAt,
      }),
    ),
  };
}

export const practiceService = {
  getPracticePageData(input?: {
    dimension?: PracticeDimensionKey;
  }) {
    const practicePool = filterPracticeQuestionsByDimension(
      questionBankService.listPracticePool(),
      input?.dimension,
    ).map((question) =>
      practiceQuestionSchema.parse({
        id: question.id,
        question_text: question.questionText,
        canonical_answer: question.canonicalAnswer,
        category: question.category,
        difficulty: question.difficulty,
        tags: question.tags,
      }),
    );
    const recentExams = assessmentRepository.listRecentCompleted(6).map((session) =>
      practiceRecentExamSchema.parse({
        id: session.id,
        status: session.status,
        total_score: session.totalScore,
        max_score: session.maxScore,
        question_count: session.questionCount,
        completed_at: session.completedAt,
        weak_labels: session.weakLabels.slice(0, 3),
        weak_areas: normalizeRecentExamWeakAreas(session.weakAreas).slice(0, 3),
      }),
    );

    return {
      practicePool,
      recentExams,
      practiceProfile: toApiPracticeProfile(),
    };
  },

  getPracticeProfile() {
    return toApiPracticeProfile();
  },

  createExamSession(input?: {
    questionCount?: number;
    dimension?: PracticeDimensionKey;
  }) {
    const questionCount = input?.questionCount ?? 10;
    const candidatePool = filterPracticeQuestionsByDimension(
      questionBankService.listPracticePool(),
      input?.dimension,
    )
      .filter((question) => Boolean(question.canonicalAnswer));

    if (candidatePool.length < questionCount) {
      throw new PracticeServiceError(
        "insufficient_questions",
        `当前只有 ${candidatePool.length} 道带标准答案的题目，暂时无法生成 ${questionCount} 题考试。`,
        409,
        {
          available_question_count: candidatePool.length,
          required_question_count: questionCount,
          dimension: input?.dimension,
        },
      );
    }

    const selectedQuestions = shuffleArray(candidatePool).slice(0, questionCount);
    const session = assessmentRepository.createSession({
      questionCount,
      items: selectedQuestions.map((question) => ({
        questionItemId: question.id,
        questionText: question.questionText,
        canonicalAnswer: question.canonicalAnswer,
        category: question.category,
        difficulty: question.difficulty,
        tags: question.tags,
        dimensionWeights: resolvePracticeDimensionWeights({
          category: question.category,
          tags: question.tags,
        }),
      })),
    });

    if (!session) {
      throw new PracticeServiceError(
        "internal_error",
        "创建考试会话后未能读取到结果。",
        500,
      );
    }

    return toApiAssessmentDetail(session);
  },

  getExamSessionDetail(sessionId: string) {
    const session = assessmentRepository.findById(sessionId);

    if (!session) {
      return undefined;
    }

    return toApiAssessmentDetail(session);
  },

  async submitExamSession(
    sessionId: string,
    input: z.infer<typeof submitAssessmentSessionRequestSchema>,
  ) {
    const session = assessmentRepository.findById(sessionId);

    if (!session) {
      throw new PracticeServiceError("not_found", "考试会话不存在。", 404);
    }

    if (session.status === "completed" || session.status === "failed") {
      return toApiAssessmentDetail(session);
    }

    if (session.status === "scoring") {
      throw new PracticeServiceError(
        "invalid_state",
        "该考试正在评分中，请勿重复提交。",
        409,
      );
    }

    const payload = submitAssessmentSessionRequestSchema.parse(input);
    const itemIdSet = new Set(session.items.map((item) => item.id));
    const answerIds = new Set(payload.answers.map((answer) => answer.assessment_item_id));

    if (
      payload.answers.length !== session.items.length ||
      answerIds.size !== session.items.length ||
      [...answerIds].some((answerId) => !itemIdSet.has(answerId))
    ) {
      throw new PracticeServiceError(
        "invalid_request",
        "提交答案必须完整覆盖当前考试的全部题目。",
        400,
      );
    }

    const claimed = assessmentRepository.tryClaimForScoring(sessionId);
    if (!claimed) {
      throw new PracticeServiceError(
        "invalid_state",
        "该考试已被提交或正在评分中。",
        409,
      );
    }

    assessmentRepository.saveAnswers(
      sessionId,
      payload.answers.map((answer) => ({
        assessmentItemId: answer.assessment_item_id,
        userAnswer: answer.user_answer,
      })),
    );
    const scoringSession = assessmentRepository.findById(sessionId);

    if (!scoringSession) {
      throw new PracticeServiceError(
        "not_found",
        "考试会话在进入评分阶段时不存在。",
        404,
      );
    }

    const gradingResult = await gradeAssessmentBatch(
      scoringSession.items.map((item) => ({
        id: item.id,
        sequenceNo: item.sequenceNo,
        questionTextSnapshot: item.questionTextSnapshot,
        canonicalAnswerSnapshot: item.canonicalAnswerSnapshot,
        categorySnapshot: item.categorySnapshot,
        tags: item.tags,
        dimensionWeights: item.dimensionWeights,
        userAnswer: item.userAnswer,
        maxScore: item.maxScore,
      })),
    );
    const completedAt = nowUtcIso();
    const updatedProfile = practiceProfileRepository.applyExamResult({
      sessionId,
      assessedAt: completedAt,
      examDimensions: gradingResult.summary.exam_radar_dimensions.map((dimension) => ({
        key: dimension.key,
        averageScore: dimension.average_score,
        coverageWeight: dimension.coverage_weight,
      })),
    });

    if (!updatedProfile) {
      throw new PracticeServiceError(
        "internal_error",
        "评分后未能更新长期能力画像。",
        500,
      );
    }

    const coveredDimensionSet = new Set(
      gradingResult.summary.exam_radar_dimensions.map((dimension) => dimension.key),
    );
    const resultSummary = assessmentResultSummaryV2Schema.parse({
      overall_feedback: gradingResult.summary.overall_feedback,
      weak_areas: gradingResult.summary.weak_areas,
      exam_radar_dimensions: gradingResult.summary.exam_radar_dimensions,
      profile_radar_dimensions: updatedProfile.dimensions.map((dimension) => ({
        key: dimension.key,
        label: dimension.label,
        score: dimension.score,
        evidence_count: dimension.evidenceCount,
        last_assessed_at: dimension.lastAssessedAt,
        covered_in_exam: coveredDimensionSet.has(dimension.key),
      })),
      profile_updates: updatedProfile.updates.map((update) => ({
        key: update.key,
        label:
          updatedProfile.dimensions.find((dimension) => dimension.key === update.key)
            ?.label ?? update.key,
        previous_score: update.previousScore,
        new_score: update.newScore,
        exam_score: update.examScore,
        coverage_weight: update.coverageWeight,
        update_weight: update.updateWeight,
      })),
    });
    const completedSession = assessmentRepository.completeSession({
      sessionId,
      completedAt,
      totalScore: gradingResult.totalScore,
      summary: resultSummary,
      items: gradingResult.items.map((item) => ({
        assessmentItemId: item.assessmentItemId,
        score: item.score,
        maxScore: item.maxScore,
        feedback: item.feedback,
        skillScores: item.skillScores,
      })),
    });

    if (!completedSession) {
      throw new PracticeServiceError(
        "internal_error",
        "评分完成后未能读取到考试结果。",
        500,
      );
    }

    return toApiAssessmentDetail(completedSession);
  },
};
