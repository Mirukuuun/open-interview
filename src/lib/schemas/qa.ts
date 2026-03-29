import { z } from "zod";

import { relatedQuestionSchema } from "@/lib/schemas/questions";
import {
  retrievalFinalContextSchema,
  retrievalHitSchema,
  retrievalLogSchema,
} from "@/lib/schemas/retrieval";

function coerceOptionalTrimmedString(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmedValue = value.trim();

      return trimmedValue.length > 0 ? trimmedValue : undefined;
    },
    z.string().min(1).max(maxLength).optional(),
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

      return Math.min(numericValue, maxValue);
    },
    z.number().int().min(1).max(maxValue),
  );
}

function coerceQaStrategy(defaultValue: "fts" | "hybrid") {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return defaultValue;
      }

      return value === "fts" || value === "hybrid" ? value : defaultValue;
    },
    z.enum(["fts", "hybrid"]),
  );
}

export const qaAnswerModeSchema = z.enum([
  "grounded_answered",
  "weak_support",
  "no_grounded_support",
]);

export const qaSessionSchema = z.object({
  id: z.string().min(1),
  session_type: z.literal("qa"),
  status: z.enum(["active", "completed", "archived"]),
  provider: z.literal("openclaw"),
  title: z.string().min(1).nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const qaCitationSchema = z.object({
  owner_type: z.literal("question_item"),
  owner_id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
  snippet: z.string().min(1).nullable().optional(),
  source_document: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
      href: z.string().min(1).nullable().optional(),
      source_snippet: z.string().min(1).nullable().optional(),
    })
    .optional(),
});

export const qaSessionTurnSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  citations: z.array(qaCitationSchema).default([]),
  answer_mode: qaAnswerModeSchema.optional(),
  support_summary: z.string().min(1).nullable().optional(),
  related_questions: z.array(relatedQuestionSchema).default([]),
  retrieval_log_id: z.string().min(1).nullable().optional(),
  retrieval_log: retrievalLogSchema.nullable().optional(),
  created_at: z.string().datetime(),
});

export const qaRetrievalSummarySchema = z.object({
  text: z.string().min(1),
  rewrite_applied: z.boolean(),
  support_level: qaAnswerModeSchema,
  lexical_hits: z.number().int().min(0),
  vector_hits: z.number().int().min(0),
  merged_hits: z.number().int().min(0),
});

export const createQaSessionRequestSchema = z
  .object({
    title: coerceOptionalTrimmedString(120),
  })
  .strict();

export const createQaSessionResponseDataSchema = z.object({
  ai_session: qaSessionSchema,
});

export const deleteQaSessionResponseDataSchema = z.object({
  ai_session: qaSessionSchema,
});

export const askQaSessionRequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  top_k: coercePositiveInteger(8, 12),
  strategy: coerceQaStrategy("hybrid"),
});

export const askQaSessionResponseDataSchema = z.object({
  answer: z.string().min(1),
  answer_mode: qaAnswerModeSchema,
  support_summary: z.string().min(1),
  citations: z.array(qaCitationSchema),
  related_questions: z.array(relatedQuestionSchema),
  retrieval_log_id: z.string().min(1),
  retrieval_summary: qaRetrievalSummarySchema,
  rewrite_applied: z.boolean(),
  strategy: z.enum(["fts", "hybrid"]),
});

export const getQaSessionResponseDataSchema = z.object({
  ai_session: qaSessionSchema,
  turns: z.array(qaSessionTurnSchema),
});

export type AskQaSessionRequest = z.infer<typeof askQaSessionRequestSchema>;
export type AskQaSessionResponseData = z.infer<typeof askQaSessionResponseDataSchema>;
export type CreateQaSessionResponseData = z.infer<
  typeof createQaSessionResponseDataSchema
>;
export type DeleteQaSessionResponseData = z.infer<
  typeof deleteQaSessionResponseDataSchema
>;
export type GetQaSessionResponseData = z.infer<typeof getQaSessionResponseDataSchema>;
export type QaCitation = z.infer<typeof qaCitationSchema>;
export type QaAnswerMode = z.infer<typeof qaAnswerModeSchema>;
export type QaSession = z.infer<typeof qaSessionSchema>;
export type QaSessionTurn = z.infer<typeof qaSessionTurnSchema>;
export type RetrievalFinalContext = z.infer<typeof retrievalFinalContextSchema>;
export type RetrievalHit = z.infer<typeof retrievalHitSchema>;
export type RetrievalLog = z.infer<typeof retrievalLogSchema>;
