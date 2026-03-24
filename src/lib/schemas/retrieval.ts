import { z } from "zod";

export const retrievalQueryTypeSchema = z.enum([
  "qa",
  "resume_deep_dive",
  "mock_interview",
]);

export const retrievalStrategySchema = z.enum(["fts", "vector", "hybrid"]);

export const retrievalHitSchema = z.object({
  owner_type: z.enum([
    "question_item",
    "answer_variant",
    "source_document",
    "resume_project",
  ]),
  owner_id: z.string().min(1),
  chunk_id: z.string().min(1).nullable().optional(),
  score: z.number().min(0),
  reason: z.enum(["fts", "vector", "merged"]),
  snippet: z.string().min(1),
});

export const retrievalFinalContextSchema = z.object({
  question_ids: z.array(z.string().min(1)),
  chunk_ids: z.array(z.string().min(1)),
  related_question_ids: z.array(z.string().min(1)).default([]),
  source_document_ids: z.array(z.string().min(1)).default([]),
  resume_project_ids: z.array(z.string().min(1)).default([]),
  strategy_notes: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  corpus_sync: z
    .object({
      question_chunks: z.number().int().min(0),
      answer_chunks: z.number().int().min(0),
      source_excerpt_chunks: z.number().int().min(0),
    })
    .nullable()
    .optional(),
});

export const retrievalLogSchema = z.object({
  id: z.string().min(1),
  query_text: z.string().min(1),
  query_type: retrievalQueryTypeSchema,
  strategy: retrievalStrategySchema,
  hits: z.array(retrievalHitSchema),
  final_context: retrievalFinalContextSchema,
  created_at: z.string().datetime(),
});

export type RetrievalFinalContext = z.infer<typeof retrievalFinalContextSchema>;
export type RetrievalHit = z.infer<typeof retrievalHitSchema>;
export type RetrievalLog = z.infer<typeof retrievalLogSchema>;
