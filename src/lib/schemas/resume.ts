import { z } from "zod";

import { relatedQuestionSchema } from "@/lib/schemas/questions";
import { retrievalLogSchema } from "@/lib/schemas/retrieval";

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

export const resumeDocumentSchema = z.object({
  id: z.string().min(1),
  source_document_id: z.string().min(1),
  candidate_name: z.string().min(1).nullable().optional(),
  summary: z.string().min(1).nullable().optional(),
  project_count: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const resumeProjectSchema = z.object({
  id: z.string().min(1),
  resume_document_id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1).nullable().optional(),
  highlights: z.array(z.string().min(1)).default([]),
  tech_stack: z.array(z.string().min(1)).default([]),
  deep_dive_questions: z.array(z.string().min(1)).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const resumeProjectSessionSchema = z.object({
  id: z.string().min(1),
  session_type: z.literal("resume_deep_dive"),
  status: z.enum(["active", "completed", "archived"]),
  related_resume_project_id: z.string().min(1),
  provider: z.literal("openclaw"),
  title: z.string().min(1).nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const resumeProjectSessionTurnSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  coach_hints: z.array(z.string()).default([]),
  related_questions: z.array(relatedQuestionSchema).default([]),
  retrieval_log_id: z.string().min(1).nullable().optional(),
  retrieval_log: retrievalLogSchema.nullable().optional(),
  created_at: z.string().datetime(),
});

export const resumeProjectSummarySchema = resumeProjectSchema.extend({
  session_count: z.number().int().min(0),
  latest_session_id: z.string().min(1).nullable().optional(),
  latest_session_updated_at: z.string().datetime().nullable().optional(),
});

export const resumeProjectDetailSchema = resumeProjectSchema.extend({
  resume_document: resumeDocumentSchema,
  source_document: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    parse_status: z.enum([
      "not_started",
      "pending",
      "running",
      "needs_review",
      "confirmed",
      "failed",
    ]),
    updated_at: z.string().datetime(),
  }),
  sessions: z.array(resumeProjectSessionSchema),
});

export const createResumeFromSourceRequestSchema = z
  .object({
    source_document_id: z.string().trim().min(1),
  })
  .strict();

export const createResumeFromSourceResponseDataSchema = z.object({
  resume_document: resumeDocumentSchema,
  projects: z.array(resumeProjectSchema),
});

export const getResumeProjectsResponseDataSchema = z.object({
  resume_document: resumeDocumentSchema,
  items: z.array(resumeProjectSummarySchema),
});

export const getResumeProjectResponseDataSchema = z.object({
  resume_project: resumeProjectDetailSchema,
});

export const createResumeProjectSessionRequestSchema = z
  .object({
    mode: z.literal("resume_deep_dive"),
    title: coerceOptionalTrimmedString(120),
  })
  .strict();

export const createResumeProjectSessionResponseDataSchema = z.object({
  ai_session: resumeProjectSessionSchema,
});

export const askResumeProjectSessionRequestSchema = z
  .object({
    answer: z.string().trim().min(1).max(4000),
  })
  .strict();

export const askResumeProjectSessionResponseDataSchema = z.object({
  next_question: z.string().min(1),
  coach_hints: z.array(z.string()),
  retrieval_log_id: z.string().min(1),
});

export const getResumeProjectSessionResponseDataSchema = z.object({
  resume_project: resumeProjectDetailSchema,
  ai_session: resumeProjectSessionSchema,
  turns: z.array(resumeProjectSessionTurnSchema),
});

export type AskResumeProjectSessionRequest = z.infer<
  typeof askResumeProjectSessionRequestSchema
>;
export type AskResumeProjectSessionResponseData = z.infer<
  typeof askResumeProjectSessionResponseDataSchema
>;
export type CreateResumeFromSourceRequest = z.infer<
  typeof createResumeFromSourceRequestSchema
>;
export type CreateResumeFromSourceResponseData = z.infer<
  typeof createResumeFromSourceResponseDataSchema
>;
export type CreateResumeProjectSessionResponseData = z.infer<
  typeof createResumeProjectSessionResponseDataSchema
>;
export type GetResumeProjectResponseData = z.infer<
  typeof getResumeProjectResponseDataSchema
>;
export type GetResumeProjectSessionResponseData = z.infer<
  typeof getResumeProjectSessionResponseDataSchema
>;
export type GetResumeProjectsResponseData = z.infer<
  typeof getResumeProjectsResponseDataSchema
>;
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export type ResumeProject = z.infer<typeof resumeProjectSchema>;
export type ResumeProjectDetail = z.infer<typeof resumeProjectDetailSchema>;
export type ResumeProjectSession = z.infer<typeof resumeProjectSessionSchema>;
export type ResumeProjectSessionTurn = z.infer<
  typeof resumeProjectSessionTurnSchema
>;
export type ResumeProjectSummary = z.infer<typeof resumeProjectSummarySchema>;
