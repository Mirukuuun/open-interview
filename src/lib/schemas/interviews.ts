import { z } from "zod";

function coerceOptionalString() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmedValue = value.trim();

      return trimmedValue.length > 0 ? trimmedValue : undefined;
    },
    z.string().min(1).optional(),
  );
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

export const listInterviewsQuerySchema = z.object({
  q: coerceOptionalString(),
  company: coerceOptionalString(),
  tag: coerceOptionalString(),
  page: coercePositiveInteger(1, 999),
  page_size: coercePositiveInteger(20, 100),
});

export const interviewListItemSchema = z.object({
  id: z.string().min(1),
  source_document_id: z.string().min(1),
  source_title: z.string().min(1),
  company: z.string().min(1).nullable().optional(),
  role: z.string().min(1).nullable().optional(),
  round_info: z.string().min(1).nullable().optional(),
  summary: z.string().min(1).nullable().optional(),
  question_count: z.number().int().min(0),
  tags: z.array(z.string()),
  updated_at: z.string().datetime(),
});

export const listInterviewsResponseDataSchema = z.object({
  items: z.array(interviewListItemSchema),
  page: z.number().int().min(1),
  page_size: z.number().int().min(1),
  total: z.number().int().min(0),
});

export const interviewRecommendedQuestionSchema = z.object({
  id: z.string().min(1),
  question_text: z.string().min(1),
  category: z.string().min(1).nullable().optional(),
  source_count: z.number().int().min(0),
  tags: z.array(z.string()),
  match_score: z.number().min(0),
});

export const promotedInterviewQuestionSchema = z.object({
  question_item_id: z.string().min(1),
  question_text: z.string().min(1),
  category: z.string().min(1).nullable().optional(),
  tags: z.array(z.string()),
  link_type: z.enum(["promoted_create", "promoted_merge"]),
});

export const interviewQuestionSchema = z.object({
  id: z.string().min(1),
  source_kind: z.enum(["interview_question", "legacy_question_link"]),
  question_text: z.string().min(1),
  source_answer: z.string().min(1).nullable().optional(),
  category: z.string().min(1).nullable().optional(),
  source_snippet: z.string().min(1).nullable().optional(),
  tags: z.array(z.string()),
  promoted_questions: z.array(promotedInterviewQuestionSchema),
  recommended_questions: z.array(interviewRecommendedQuestionSchema),
});

export const interviewSourceDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum([
    "interview_experience",
    "knowledge_note",
    "resume",
    "manual_input",
  ]),
  file_name: z.string().min(1).nullable().optional(),
  source_url: z.string().min(1).nullable().optional(),
  raw_text: z.string().min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const interviewDetailSchema = z.object({
  id: z.string().min(1),
  source_document_id: z.string().min(1),
  company: z.string().min(1).nullable().optional(),
  role: z.string().min(1).nullable().optional(),
  round_info: z.string().min(1).nullable().optional(),
  summary: z.string().min(1).nullable().optional(),
  question_count: z.number().int().min(0),
  tags: z.array(z.string()),
  updated_at: z.string().datetime(),
  questions: z.array(interviewQuestionSchema),
  source_document: interviewSourceDocumentSchema,
});

export const getInterviewResponseDataSchema = z.object({
  interview_experience: interviewDetailSchema,
});

export type InterviewDetail = z.infer<typeof interviewDetailSchema>;
export type InterviewListItem = z.infer<typeof interviewListItemSchema>;
export type ListInterviewsQuery = z.infer<typeof listInterviewsQuerySchema>;
