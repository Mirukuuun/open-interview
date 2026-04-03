/**
 * [POS] 汇总系统健康快照，供 `/api/health` 暴露运行态摘要。
 * [IN] 无显式入参；聚合 LLM provider 探测结果与 Milvus foundation 状态。
 * [OUT] 返回符合 health schema 的快照，不修改持久化状态。
 *
 * @feature open-interview-server-core-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

import type { HealthPayload } from "@/lib/schemas/health";
import { getLlmProviderHealth } from "@/server/health/llm-provider";
import { qaMilvusFoundationService } from "@/server/vector/qa-milvus-foundation";

export async function getHealthSnapshot(): Promise<HealthPayload> {
  const [llmProvider, vectorFoundation] = await Promise.all([
    getLlmProviderHealth(),
    qaMilvusFoundationService.prepare({
      runSync: false,
      refreshCorpus: false,
    }),
  ]);

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
    llm_provider: llmProvider,
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
