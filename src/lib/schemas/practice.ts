import { z } from "zod";

import {
  practiceDimensionKeySchema,
  practiceDimensionKeys,
} from "@/lib/practice-dimensions";
import { questionDifficultySchema } from "@/lib/schemas/questions";

function coercePositiveInteger(defaultValue: number, maxValue: number) {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return defaultValue;
      }

      const numericValue = Number(value);

      if (!Number.isInteger(numericValue) || numericValue < 1) {
        return defaultValue;
      }

      return Math.min(numericValue, maxValue);
    },
    z.number().int().min(1).max(maxValue),
  );
}

export const practiceQuestionSchema = z.object({
  id: z.string().min(1),
  question_text: z.string().min(1),
  canonical_answer: z.string().min(1).nullable().optional(),
  category: z.string().min(1).nullable().optional(),
  difficulty: questionDifficultySchema.nullable().optional(),
  tags: z.array(z.string()),
});

export const practiceRecentExamSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["completed", "failed"]),
  total_score: z.number().int().min(0).nullable().optional(),
  max_score: z.number().int().min(1),
  question_count: z.number().int().min(1),
  completed_at: z.string().datetime().nullable().optional(),
  weak_labels: z.array(z.string()),
  weak_areas: z
    .array(
      z.object({
        key: practiceDimensionKeySchema,
        label: z.string().min(1),
        average_score: z.number().min(0).max(10),
      }),
    )
    .default([]),
});

export const practiceDimensionWeightSchema = z.object({
  key: practiceDimensionKeySchema,
  weight: z.number().positive().max(1),
});

export const assessmentSkillScoresSchema = z.object({
  accuracy: z.number().int().min(0).max(10),
  coverage: z.number().int().min(0).max(10),
  clarity: z.number().int().min(0).max(10),
});

export const assessmentFeedbackSchema = z.object({
  strengths: z.array(z.string().min(1)).max(3),
  missed_points: z.array(z.string().min(1)).max(4),
  improvement_advice: z.string().min(1),
});

export const assessmentItemSchema = z.object({
  id: z.string().min(1),
  sequence_no: z.number().int().min(1),
  question_item_id: z.string().min(1),
  question_text: z.string().min(1),
  canonical_answer: z.string().min(1).nullable().optional(),
  category: z.string().min(1).nullable().optional(),
  difficulty: questionDifficultySchema.nullable().optional(),
  tags: z.array(z.string()),
  dimension_weights: z
    .array(practiceDimensionWeightSchema)
    .max(practiceDimensionKeys.length)
    .default([]),
  user_answer: z.string().max(4_000).nullable().optional(),
  score: z.number().int().min(0).max(10).nullable().optional(),
  max_score: z.number().int().min(1),
  feedback: assessmentFeedbackSchema.nullable().optional(),
  skill_scores: assessmentSkillScoresSchema.nullable().optional(),
});

export const assessmentSessionSchema = z.object({
  id: z.string().min(1),
  mode: z.literal("exam"),
  status: z.enum(["active", "scoring", "completed", "failed"]),
  question_count: z.number().int().min(1),
  total_score: z.number().int().min(0).nullable().optional(),
  max_score: z.number().int().min(1),
  started_at: z.string().datetime(),
  submitted_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const legacyAssessmentWeakAreaSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  question_count: z.number().int().min(1),
  average_score: z.number().min(0).max(10),
});

export const legacyAssessmentRadarDimensionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  average_score: z.number().min(0).max(10),
});

export const legacyAssessmentResultSummarySchema = z.object({
  overall_feedback: z.string().min(1),
  weak_areas: z.array(legacyAssessmentWeakAreaSchema),
  radar_dimensions: z.array(legacyAssessmentRadarDimensionSchema).max(5),
});

export const assessmentExamDimensionSchema = z.object({
  key: practiceDimensionKeySchema,
  label: z.string().min(1),
  question_count: z.number().int().min(1),
  coverage_weight: z.number().positive(),
  average_score: z.number().min(0).max(10),
});

export const practiceProfileRadarDimensionSchema = z.object({
  key: practiceDimensionKeySchema,
  label: z.string().min(1),
  score: z.number().min(0).max(10),
  evidence_count: z.number().min(0),
  last_assessed_at: z.string().datetime().nullable().optional(),
  covered_in_exam: z.boolean(),
});

export const practiceProfileUpdateSchema = z.object({
  key: practiceDimensionKeySchema,
  label: z.string().min(1),
  previous_score: z.number().min(0).max(10).nullable().optional(),
  new_score: z.number().min(0).max(10),
  exam_score: z.number().min(0).max(10),
  coverage_weight: z.number().positive(),
  update_weight: z.number().positive().max(1),
});

export const assessmentResultSummaryV2Schema = z.object({
  overall_feedback: z.string().min(1),
  weak_areas: z.array(assessmentExamDimensionSchema),
  exam_radar_dimensions: z
    .array(assessmentExamDimensionSchema)
    .max(practiceDimensionKeys.length),
  profile_radar_dimensions: z
    .array(practiceProfileRadarDimensionSchema)
    .length(practiceDimensionKeys.length),
  profile_updates: z
    .array(practiceProfileUpdateSchema)
    .max(practiceDimensionKeys.length),
});

export const assessmentResultSummarySchema = z.union([
  assessmentResultSummaryV2Schema,
  legacyAssessmentResultSummarySchema,
]);

export const practiceProfileSchema = z.object({
  id: z.string().min(1),
  scope: z.literal("local_default"),
  dimension_catalog_version: z.string().min(1),
  last_exam_session_id: z.string().min(1).nullable().optional(),
  last_assessed_at: z.string().datetime().nullable().optional(),
});

export const practiceProfileDimensionSchema = z.object({
  key: practiceDimensionKeySchema,
  label: z.string().min(1),
  score: z.number().min(0).max(10),
  evidence_count: z.number().min(0),
  last_exam_score: z.number().min(0).max(10).nullable().optional(),
  last_assessed_at: z.string().datetime().nullable().optional(),
});

export const createAssessmentSessionRequestSchema = z
  .object({
    question_count: coercePositiveInteger(10, 10).default(10),
    dimension: practiceDimensionKeySchema.optional(),
  })
  .strict();

export const createAssessmentSessionResponseDataSchema = z.object({
  assessment_session: assessmentSessionSchema,
  items: z.array(assessmentItemSchema),
});

export const getAssessmentSessionResponseDataSchema = z.object({
  assessment_session: assessmentSessionSchema,
  items: z.array(assessmentItemSchema),
  result_summary: assessmentResultSummarySchema.nullable().optional(),
});

export const submitAssessmentAnswerSchema = z.object({
  assessment_item_id: z.string().min(1),
  user_answer: z.string().trim().max(4_000),
});

export const submitAssessmentSessionRequestSchema = z.object({
  answers: z.array(submitAssessmentAnswerSchema).min(1).max(10),
});

export const submitAssessmentSessionResponseDataSchema = z.object({
  assessment_session: assessmentSessionSchema,
  items: z.array(assessmentItemSchema),
  result_summary: assessmentResultSummaryV2Schema,
});

export const getPracticeProfileResponseDataSchema = z.object({
  profile: practiceProfileSchema,
  dimensions: z
    .array(practiceProfileDimensionSchema)
    .length(practiceDimensionKeys.length),
});

export function isAssessmentResultSummaryV2(
  value: AssessmentResultSummary | null | undefined,
): value is AssessmentResultSummaryV2 {
  return assessmentResultSummaryV2Schema.safeParse(value).success;
}

export type AssessmentItem = z.infer<typeof assessmentItemSchema>;
export type AssessmentResultSummary = z.infer<typeof assessmentResultSummarySchema>;
export type AssessmentResultSummaryV2 = z.infer<
  typeof assessmentResultSummaryV2Schema
>;
export type AssessmentSession = z.infer<typeof assessmentSessionSchema>;
export type CreateAssessmentSessionResponseData = z.infer<
  typeof createAssessmentSessionResponseDataSchema
>;
export type GetAssessmentSessionResponseData = z.infer<
  typeof getAssessmentSessionResponseDataSchema
>;
export type LegacyAssessmentResultSummary = z.infer<
  typeof legacyAssessmentResultSummarySchema
>;
export type PracticeProfile = z.infer<typeof practiceProfileSchema>;
export type PracticeProfileDimension = z.infer<
  typeof practiceProfileDimensionSchema
>;
export type PracticeProfileUpdate = z.infer<typeof practiceProfileUpdateSchema>;
export type PracticeQuestion = z.infer<typeof practiceQuestionSchema>;
export type PracticeRecentExam = z.infer<typeof practiceRecentExamSchema>;
export type PracticeDimensionWeight = z.infer<typeof practiceDimensionWeightSchema>;
export type SubmitAssessmentSessionResponseData = z.infer<
  typeof submitAssessmentSessionResponseDataSchema
>;
