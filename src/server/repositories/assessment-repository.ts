import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  assessmentFeedbackSchema,
  assessmentResultSummarySchema,
  assessmentResultSummaryV2Schema,
  assessmentSkillScoresSchema,
  practiceDimensionWeightSchema,
} from "@/lib/schemas/practice";
import { db } from "@/server/db/client";
import { assessmentItems, assessmentSessions } from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";
import { parseJsonStringArray } from "@/server/repositories/search-helpers";

/**
 * [POS] 维护模拟考试 session/item 的持久化边界，包括题面快照、用户答案、评分结果与最近记录读取。
 * [IN] 考试创建、答案提交、评分落库、详情查询等 assessment 级输入。
 * [OUT] 返回稳定的 assessment session/item 读模型，并负责维护状态与时间戳副作用。
 *
 * @feature open-interview-practice-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

const createAssessmentSessionInputSchema = z.object({
  id: z.string().min(1).optional(),
  mode: z.literal("exam").default("exam"),
  questionCount: z.number().int().min(1).max(10),
  maxScore: z.number().int().min(1).default(100),
  items: z
    .array(
      z.object({
        questionItemId: z.string().min(1),
        questionText: z.string().min(1),
        canonicalAnswer: z.string().min(1).nullable().optional(),
        category: z.string().min(1).nullable().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
        tags: z.array(z.string()),
        dimensionWeights: z.array(practiceDimensionWeightSchema).default([]),
      }),
    )
    .min(1)
    .max(10),
});

const assessmentAnswerUpdateSchema = z.object({
  assessmentItemId: z.string().min(1),
  userAnswer: z.string().max(4_000),
});

const assessmentScoreItemSchema = z.object({
  assessmentItemId: z.string().min(1),
  score: z.number().int().min(0).max(10),
  maxScore: z.number().int().min(1).default(10),
  feedback: assessmentFeedbackSchema,
  skillScores: assessmentSkillScoresSchema,
});

type StoredAssessmentSummary = z.infer<typeof assessmentResultSummaryV2Schema>;

function parseJsonObject<TSchema extends z.ZodTypeAny>(
  value: string | null | undefined,
  schema: TSchema,
): z.infer<TSchema> | null {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value);
    const result = schema.safeParse(parsedValue);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function getSessionById(sessionId: string) {
  return db
    .select()
    .from(assessmentSessions)
    .where(eq(assessmentSessions.id, sessionId))
    .limit(1)
    .all()[0];
}

export const assessmentRepository = {
  createSession(input: z.input<typeof createAssessmentSessionInputSchema>) {
    const value = createAssessmentSessionInputSchema.parse(input);
    const timestamp = nowUtcIso();
    const session = {
      id: value.id ?? createOpaqueId("exam"),
      mode: value.mode,
      status: "active" as const,
      questionCount: value.questionCount,
      totalScore: null,
      maxScore: value.maxScore,
      summaryJson: null,
      scoringProvider: "openclaw" as const,
      startedAt: timestamp,
      submittedAt: null,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.transaction(() => {
      db.insert(assessmentSessions).values(session).run();
      db.insert(assessmentItems)
        .values(
          value.items.map((item, index) => ({
            id: createOpaqueId("exam_item"),
            assessmentSessionId: session.id,
            questionItemId: item.questionItemId,
            sequenceNo: index + 1,
            questionTextSnapshot: item.questionText,
            canonicalAnswerSnapshot: item.canonicalAnswer ?? null,
            categorySnapshot: item.category ?? null,
            difficultySnapshot: item.difficulty ?? null,
            tagsJson: JSON.stringify(item.tags),
            dimensionWeightsJson: JSON.stringify(item.dimensionWeights),
            userAnswer: null,
            score: null,
            maxScore: 10,
            feedbackJson: null,
            skillScoresJson: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          })),
        )
        .run();
    });

    return assessmentRepository.findById(session.id);
  },

  findById(sessionId: string) {
    const session = getSessionById(sessionId);

    if (!session) {
      return undefined;
    }

    const items = db
      .select()
      .from(assessmentItems)
      .where(eq(assessmentItems.assessmentSessionId, sessionId))
      .orderBy(assessmentItems.sequenceNo)
      .all();

    return {
      ...session,
      summary: parseJsonObject(session.summaryJson, assessmentResultSummarySchema),
      items: items.map((item) => ({
        ...item,
        tags: parseJsonStringArray(item.tagsJson),
        dimensionWeights:
          parseJsonObject(
            item.dimensionWeightsJson,
            z.array(practiceDimensionWeightSchema),
          ) ?? [],
        feedback: parseJsonObject(item.feedbackJson, assessmentFeedbackSchema),
        skillScores: parseJsonObject(item.skillScoresJson, assessmentSkillScoresSchema),
      })),
    };
  },

  markScoring(sessionId: string) {
    const timestamp = nowUtcIso();

    db.update(assessmentSessions)
      .set({
        status: "scoring",
        submittedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(assessmentSessions.id, sessionId))
      .run();

    return assessmentRepository.findById(sessionId);
  },

  saveAnswers(
    sessionId: string,
    answers: Array<z.input<typeof assessmentAnswerUpdateSchema>>,
  ) {
    const value = answers.map((answer) => assessmentAnswerUpdateSchema.parse(answer));
    const timestamp = nowUtcIso();

    db.transaction(() => {
      for (const answer of value) {
        db.update(assessmentItems)
          .set({
            userAnswer:
              answer.userAnswer.trim().length > 0 ? answer.userAnswer.trim() : null,
            updatedAt: timestamp,
          })
          .where(eq(assessmentItems.id, answer.assessmentItemId))
          .run();
      }

      db.update(assessmentSessions)
        .set({
          updatedAt: timestamp,
        })
        .where(eq(assessmentSessions.id, sessionId))
        .run();
    });

    return assessmentRepository.findById(sessionId);
  },

  completeSession(input: {
    sessionId: string;
    totalScore: number;
    summary: StoredAssessmentSummary;
    items: Array<z.input<typeof assessmentScoreItemSchema>>;
    completedAt?: string;
  }) {
    const value = {
      totalScore: Math.max(0, Math.min(100, Math.round(input.totalScore))),
      summary: assessmentResultSummaryV2Schema.parse(input.summary),
      items: input.items.map((item) => assessmentScoreItemSchema.parse(item)),
    };
    const timestamp = input.completedAt ?? nowUtcIso();

    db.transaction(() => {
      for (const item of value.items) {
        db.update(assessmentItems)
          .set({
            score: item.score,
            maxScore: item.maxScore,
            feedbackJson: JSON.stringify(item.feedback),
            skillScoresJson: JSON.stringify(item.skillScores),
            updatedAt: timestamp,
          })
          .where(eq(assessmentItems.id, item.assessmentItemId))
          .run();
      }

      db.update(assessmentSessions)
        .set({
          status: "completed",
          totalScore: value.totalScore,
          summaryJson: JSON.stringify(value.summary),
          completedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(assessmentSessions.id, input.sessionId))
        .run();
    });

    return assessmentRepository.findById(input.sessionId);
  },

  failSession(sessionId: string, summary: StoredAssessmentSummary) {
    const timestamp = nowUtcIso();
    const parsedSummary = assessmentResultSummaryV2Schema.parse(summary);

    db.update(assessmentSessions)
      .set({
        status: "failed",
        summaryJson: JSON.stringify(parsedSummary),
        completedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(assessmentSessions.id, sessionId))
      .run();

    return assessmentRepository.findById(sessionId);
  },

  listRecentCompleted(limit = 6) {
    return db
      .select()
      .from(assessmentSessions)
      .where(eq(assessmentSessions.mode, "exam"))
      .orderBy(desc(assessmentSessions.updatedAt))
      .limit(limit)
      .all()
      .filter(
        (session) => session.status === "completed" || session.status === "failed",
      )
      .map((session) => {
        const summary = parseJsonObject(session.summaryJson, assessmentResultSummarySchema);

        return {
          id: session.id,
          status: session.status,
          totalScore: session.totalScore,
          maxScore: session.maxScore,
          questionCount: session.questionCount,
          completedAt: session.completedAt,
          weakLabels: (summary?.weak_areas ?? []).map((item) => item.label),
          weakAreas: (summary?.weak_areas ?? []).map((item) => ({
            key: item.key,
            label: item.label,
            averageScore: item.average_score,
          })),
        };
      });
  },
};
