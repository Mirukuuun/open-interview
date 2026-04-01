import { z } from "zod";

import {
  sourceDocumentKindSchema,
  sourceDocumentParseStatusSchema,
} from "@/lib/schemas/import";
import {
  parseInterviewExperienceSchema,
  parseResultSchema,
} from "@/lib/schemas/parse-result";

function coerceNullableString(value: unknown) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function coerceOptionalEnum<const TValues extends readonly [string, ...string[]]>(
  values: TValues,
): z.ZodType<TValues[number] | undefined> {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    return values.includes(value as TValues[number]) ? value : undefined;
  }, z.enum(values).optional());
}

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

      if (numericValue > maxValue) {
        return maxValue;
      }

      return numericValue;
    },
    z.number().int().min(1).max(maxValue),
  );
}

export const parseJobTypeSchema = z.enum([
  "extract_interview",
  "extract_resume",
  "normalize_manual_input",
]);

export const parseJobStatusSchema = z.enum([
  "pending",
  "running",
  "success",
  "failed",
  "needs_review",
  "confirmed",
]);

export const parseJobProviderSchema = z.enum(["openclaw"]);

export const reviewQuestionActionSchema = z.enum([
  "create",
  "merge",
  "keep",
  "skip",
]);

export const createParseJobRequestSchema = z.object({
  source_document_id: z.string().trim().min(1),
  job_type: parseJobTypeSchema,
});

export const parseJobStatusSummarySchema = z.object({
  pending: z.number().int().min(0),
  running: z.number().int().min(0),
  failed: z.number().int().min(0),
  needs_review: z.number().int().min(0),
  confirmed: z.number().int().min(0),
});

export const parseJobSummarySchema = z.object({
  id: z.string().min(1),
  source_document_id: z.string().min(1),
  job_type: parseJobTypeSchema,
  provider: parseJobProviderSchema,
  status: parseJobStatusSchema,
  attempt_count: z.number().int().min(0),
  error_message: z.string().min(1).nullable().optional(),
  candidate_question_count: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  started_at: z.string().datetime().nullable().optional(),
  finished_at: z.string().datetime().nullable().optional(),
});

export const parseJobListItemSchema = parseJobSummarySchema.extend({
  source_title: z.string().min(1),
  source_kind: sourceDocumentKindSchema,
  source_parse_status: sourceDocumentParseStatusSchema,
});

export const listParseJobsQuerySchema = z.object({
  status: coerceOptionalEnum([
    "pending",
    "running",
    "success",
    "failed",
    "needs_review",
    "confirmed",
  ]),
  kind: coerceOptionalEnum([
    "interview_experience",
    "knowledge_note",
    "resume",
    "manual_input",
  ]),
  q: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmedValue = value.trim();

      return trimmedValue.length > 0 ? trimmedValue : undefined;
    },
    z.string().min(1).optional(),
  ),
  page: coercePositiveInteger(1, 999),
  page_size: coercePositiveInteger(20, 100),
});

export const listParseJobsResponseDataSchema = z.object({
  items: z.array(parseJobListItemSchema),
  page: z.number().int().min(1),
  page_size: z.number().int().min(1),
  total: z.number().int().min(0),
  status_summary: parseJobStatusSummarySchema,
});

export const createParseJobResponseDataSchema = z.object({
  parse_job: parseJobSummarySchema,
});

export const getParseJobResponseDataSchema = z.object({
  parse_job: parseJobSummarySchema,
});

export const getParseJobResultResponseDataSchema = z.object({
  result: parseResultSchema.nullable(),
});

const confirmQuestionBaseSchema = z.object({
  question_text: z.string().trim().min(1),
  answer: z.preprocess(
    coerceNullableString,
    z.string().min(1).nullable().optional(),
  ),
  canonical_answer: z.preprocess(
    coerceNullableString,
    z.string().min(1).nullable().optional(),
  ),
  source_answer: z.preprocess(
    coerceNullableString,
    z.string().min(1).nullable().optional(),
  ),
  category: z.preprocess(
    coerceNullableString,
    z.string().min(1).nullable().optional(),
  ),
  tags: z
    .array(z.string())
    .default([])
    .transform((values) =>
      Array.from(
        new Set(
          values
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        ),
      ),
    ),
});

export const parseJobConfirmQuestionSchema = z.discriminatedUnion("action", [
  confirmQuestionBaseSchema.extend({
    action: z.literal("create"),
  }),
  confirmQuestionBaseSchema.extend({
    action: z.literal("merge"),
    target_question_id: z.string().trim().min(1),
  }),
  confirmQuestionBaseSchema.extend({
    action: z.literal("keep"),
  }),
  confirmQuestionBaseSchema.extend({
    action: z.literal("skip"),
  }),
]);

export const confirmParseJobRequestSchema = z.object({
  interview_experience: parseInterviewExperienceSchema.nullable().optional(),
  questions: z.array(parseJobConfirmQuestionSchema),
});

export const confirmParseJobResponseDataSchema = z.object({
  parse_job: parseJobSummarySchema,
  import_summary: z.object({
    created_questions: z.number().int().min(0),
    merged_questions: z.number().int().min(0),
    kept_interview_questions: z.number().int().min(0),
    skipped_questions: z.number().int().min(0),
    created_interview_experience_id: z.string().min(1).nullable().optional(),
  }),
});

export type CreateParseJobRequest = z.infer<typeof createParseJobRequestSchema>;
export type ConfirmParseJobRequest = z.infer<typeof confirmParseJobRequestSchema>;
export type ConfirmParseJobResponseData = z.infer<
  typeof confirmParseJobResponseDataSchema
>;
export type CreateParseJobResponseData = z.infer<
  typeof createParseJobResponseDataSchema
>;
export type ListParseJobsQuery = z.infer<typeof listParseJobsQuerySchema>;
export type ParseJobListItem = z.infer<typeof parseJobListItemSchema>;
export type ParseJobStatus = z.infer<typeof parseJobStatusSchema>;
export type ParseJobStatusSummary = z.infer<typeof parseJobStatusSummarySchema>;
export type ParseJobSummary = z.infer<typeof parseJobSummarySchema>;
