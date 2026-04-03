import { z } from "zod";

export const llmProviderHealthSchema = z.object({
  configured: z.boolean(),
  status: z.enum([
    "connected",
    "not_configured",
    "timeout",
    "connection_error",
    "response_error",
  ]),
  message: z.string().min(1),
});

const vectorHealthJobSchema = z.object({
  id: z.string().min(1),
  jobType: z.enum(["backfill", "delete_chunk", "rebuild"]),
  status: z.enum(["pending", "running", "completed", "failed"]),
  collectionName: z.string().min(1),
  attemptCount: z.number().int().min(0),
  lastError: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const vectorBackendHealthSchema = z.object({
  backend: z.literal("milvus"),
  enabled: z.boolean(),
  status: z.enum(["ok", "pending", "disabled", "degraded"]),
  collection_name: z.string().min(1),
  dimension: z.number().int().min(1),
  question_chunk_count: z.number().int().min(0),
  answer_chunk_count: z.number().int().min(0),
  source_excerpt_chunk_count: z.number().int().min(0),
  pending_embedding_count: z.number().int().min(0),
  ready_embedding_count: z.number().int().min(0),
  failed_embedding_count: z.number().int().min(0),
  pending_sync_count: z.number().int().min(0),
  synced_document_count: z.number().int().min(0),
  failed_sync_count: z.number().int().min(0),
  pending_delete_job_count: z.number().int().min(0),
  latest_job: vectorHealthJobSchema.nullable(),
  warnings: z.array(z.string()).default([]),
});

export const healthPayloadSchema = z.object({
  service: z.literal("open-interview-web"),
  status: z.literal("ok"),
  environment: z.enum(["development", "production", "test"]),
  timestamp: z.string().datetime(),
  llm_provider: llmProviderHealthSchema,
  vector_backend: vectorBackendHealthSchema,
});

export type HealthPayload = z.infer<typeof healthPayloadSchema>;
export type LlmProviderHealth = z.infer<typeof llmProviderHealthSchema>;
