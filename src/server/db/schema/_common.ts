import { integer, text } from "drizzle-orm/sqlite-core";

export const sourceDocumentKinds = [
  "interview_experience",
  "knowledge_note",
  "resume",
  "manual_input",
] as const;

export const sourceDocumentStatuses = ["active", "archived"] as const;

export const sourceDocumentParseStatuses = [
  "not_started",
  "pending",
  "running",
  "needs_review",
  "confirmed",
  "failed",
] as const;

export const parseJobTypes = [
  "extract_interview",
  "extract_resume",
  "normalize_manual_input",
] as const;

export const parseJobProviders = ["openclaw"] as const;

export const parseJobStatuses = [
  "pending",
  "running",
  "success",
  "failed",
  "needs_review",
  "confirmed",
] as const;

export const questionDifficulties = ["easy", "medium", "hard"] as const;

export const questionReviewStatuses = ["draft", "active", "archived"] as const;

export const questionCreatedFromKinds = ["ai_parse", "manual"] as const;

export const answerVariantTypes = [
  "canonical",
  "personal",
  "concise",
  "deep_dive",
  "follow_up",
] as const;

export const answerVariantAuthorTypes = ["user", "ai", "system"] as const;

export const tagTypes = ["topic", "company", "role", "skill", "custom"] as const;

export const chunkOwnerTypes = [
  "source_document",
  "question_item",
  "answer_variant",
  "resume_project",
] as const;

export const chunkTypes = [
  "source_excerpt",
  "question",
  "answer",
  "project_summary",
] as const;

export const chunkEmbeddingStatuses = ["pending", "ready", "failed"] as const;

export const vectorBackends = ["milvus"] as const;

export const vectorSyncStatuses = ["pending", "synced", "failed"] as const;

export const vectorSyncJobTypes = [
  "backfill",
  "delete_chunk",
  "rebuild",
] as const;

export const vectorSyncJobStatuses = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;

export const retrievalQueryTypes = [
  "qa",
  "resume_deep_dive",
  "mock_interview",
] as const;

export const retrievalStrategies = ["fts", "vector", "hybrid"] as const;

export const aiSessionTypes = [
  "qa",
  "resume_deep_dive",
  "mock_interview",
] as const;

export const aiSessionStatuses = ["active", "completed", "archived"] as const;

export const sessionTurnRoles = ["user", "assistant", "system"] as const;

export const qaAnswerModes = [
  "grounded_answered",
  "weak_support",
  "no_grounded_support",
] as const;

export function idColumn() {
  return text("id").notNull().primaryKey();
}

export function createdAtColumn() {
  return text("created_at").notNull();
}

export function updatedAtColumn() {
  return text("updated_at").notNull();
}

export function nullableIntegerColumn(name: string) {
  return integer(name);
}
