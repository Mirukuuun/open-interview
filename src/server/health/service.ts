import type { HealthPayload } from "@/lib/schemas/health";
import { qaMilvusFoundationService } from "@/server/vector/qa-milvus-foundation";

export async function getHealthSnapshot(): Promise<HealthPayload> {
  const vectorFoundation = await qaMilvusFoundationService.prepare({
    runSync: false,
    refreshCorpus: false,
  });

  return {
    service: "open-interview-web",
    status: "ok",
    environment:
      process.env.NODE_ENV === "production"
        ? "production"
        : process.env.NODE_ENV === "test"
          ? "test"
          : "development",
    timestamp: new Date().toISOString(),
    vector_backend: {
      backend: "milvus",
      enabled: vectorFoundation.enabled,
      status: vectorFoundation.status,
      collection_name: vectorFoundation.collectionName,
      dimension: vectorFoundation.dimension,
      question_chunk_count: vectorFoundation.questionChunkCount,
      answer_chunk_count: vectorFoundation.answerChunkCount,
      source_excerpt_chunk_count: vectorFoundation.sourceExcerptChunkCount,
      pending_embedding_count: vectorFoundation.pendingEmbeddingCount,
      ready_embedding_count: vectorFoundation.readyEmbeddingCount,
      failed_embedding_count: vectorFoundation.failedEmbeddingCount,
      pending_sync_count: vectorFoundation.pendingSyncCount,
      synced_document_count: vectorFoundation.syncedDocumentCount,
      failed_sync_count: vectorFoundation.failedSyncCount,
      pending_delete_job_count: vectorFoundation.pendingDeleteJobCount,
      latest_job: vectorFoundation.latestJob,
      warnings: vectorFoundation.warnings,
    },
  };
}
