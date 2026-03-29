import {
  openClawEmbeddingClient,
  resolveOpenClawEmbeddingConfig,
} from "@/server/adapters/openclaw/embedding-client";
import { chunkRepository } from "@/server/repositories/chunk-repository";
import { vectorSyncRepository } from "@/server/repositories/vector-sync-repository";
import {
  milvusVectorBackend,
} from "@/server/vector/milvus-backend";
import { getMilvusConfig } from "@/server/vector/milvus-config";
import { buildQaMilvusVectorDocument } from "@/server/vector/milvus-schema";

/**
 * [POS] 串联 QA chunks、embedding generation、Milvus upsert/delete 和 foundation health summary。
 * [IN] SQLite canonical chunks、OpenClaw embedding adapter、Milvus backend adapter。
 * [OUT] 返回 9B 所需的 sync summary / warning / health，并在允许时推进小批量同步。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

function formatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected Milvus foundation error.";
}

function buildWarnings(input: {
  milvusEnabled: boolean;
  pendingSyncCount: number;
  failedSyncCount: number;
  failedEmbeddingCount: number;
  healthStatus: "ok" | "disabled" | "degraded";
  healthError?: string;
}) {
  const warnings: string[] = [];

  if (!input.milvusEnabled) {
    warnings.push("Milvus is disabled in the current environment; QA still falls back to SQLite FTS.");
  }

  if (input.pendingSyncCount > 0) {
    warnings.push(
      `Milvus foundation still has ${input.pendingSyncCount} pending chunk sync records.`,
    );
  }

  if (input.failedEmbeddingCount > 0 || input.failedSyncCount > 0) {
    warnings.push(
      `Milvus foundation recorded ${input.failedEmbeddingCount} embedding failures and ${input.failedSyncCount} sync failures.`,
    );
  }

  if (input.healthStatus === "degraded" && input.healthError) {
    warnings.push(`Milvus health probe degraded: ${input.healthError}`);
  }

  return warnings;
}

async function reconcileQaCorpus() {
  const syncQuestionChunks = chunkRepository.syncQuestionChunks();
  const syncAnswerVariantChunks = chunkRepository.syncAnswerVariantChunks();
  const syncSourceExcerptChunks = chunkRepository.syncSourceExcerptChunks();
  const embeddingConfig = await resolveOpenClawEmbeddingConfig();
  const qaChunks = chunkRepository.listQaChunks();
  const reconcileResult = vectorSyncRepository.reconcileQaChunks({
    chunks: qaChunks,
    embeddingProvider: "openclaw",
    embeddingModel: embeddingConfig.model,
  });

  return {
    syncQuestionChunks,
    syncAnswerVariantChunks,
    syncSourceExcerptChunks,
    embeddingConfig,
    reconcileResult,
  };
}

async function readCurrentQaFoundationState() {
  const embeddingConfig = await resolveOpenClawEmbeddingConfig();
  const chunkCounts = chunkRepository.countByChunkType();

  return {
    syncQuestionChunks: {
      questionChunkCount: chunkCounts.questionCount,
      answerChunkCount: 0,
    },
    syncAnswerVariantChunks: {
      chunkCount: chunkCounts.answerCount,
    },
    syncSourceExcerptChunks: {
      chunkCount: chunkCounts.sourceExcerptCount,
    },
    embeddingConfig,
    reconcileResult: {
      pendingChunkCount: 0,
      readyChunkCount: 0,
      collectionName: getMilvusConfig().collectionName,
    },
  };
}

async function processDeleteJobs(limit: number) {
  if (!milvusVectorBackend.isEnabled()) {
    return {
      deletedCount: 0,
    };
  }

  const jobs = vectorSyncRepository.listPendingDeleteJobs(limit);
  let deletedCount = 0;

  for (const job of jobs) {
    if (!job.targetChunkId) {
      vectorSyncRepository.markJobFailed(job.id, "Delete job was missing target_chunk_id.");
      continue;
    }

    vectorSyncRepository.markDeleteJobRunning(job.id);

    try {
      await milvusVectorBackend.deleteQaDocument(job.targetChunkId);
      vectorSyncRepository.markJobCompleted(job.id);
      deletedCount += 1;
    } catch (error) {
      vectorSyncRepository.markJobFailed(job.id, formatErrorMessage(error));
    }
  }

  return {
    deletedCount,
  };
}

async function processPendingChunkBatch(limit: number) {
  const milvusConfig = getMilvusConfig();

  if (!milvusConfig.enabled) {
    return {
      processedChunkCount: 0,
    };
  }

  const pendingChunks = vectorSyncRepository.listPendingQaChunkSyncBatch(limit);

  if (pendingChunks.length === 0) {
    return {
      processedChunkCount: 0,
    };
  }

  const embeddingConfig = await resolveOpenClawEmbeddingConfig();
  const embeddingResponse = await openClawEmbeddingClient.createEmbeddings({
    texts: pendingChunks.map((chunk) => chunk.content),
  });

  if (embeddingResponse.vectors.length !== pendingChunks.length) {
    throw new Error(
      `Embedding batch size mismatch. expected=${pendingChunks.length} actual=${embeddingResponse.vectors.length}`,
    );
  }

  if (
    embeddingResponse.dimensions > 0 &&
    embeddingResponse.dimensions !== milvusConfig.dimension
  ) {
    throw new Error(
      `Embedding dimensions ${embeddingResponse.dimensions} did not match Milvus dimension ${milvusConfig.dimension}.`,
    );
  }

  const documents = pendingChunks.map((chunk, index) =>
    buildQaMilvusVectorDocument({
      chunk,
      embedding: embeddingResponse.vectors[index],
      contentHash: chunk.contentHash,
    }),
  );

  await milvusVectorBackend.upsertQaDocuments(documents);

  for (const chunk of pendingChunks) {
    vectorSyncRepository.markChunkSynced({
      chunkId: chunk.id,
      contentHash: chunk.contentHash,
      dims: embeddingResponse.dimensions,
      embeddingProvider: "openclaw",
      embeddingModel: embeddingConfig.model,
    });
  }

  return {
    processedChunkCount: pendingChunks.length,
  };
}

async function runSyncBatch(limit: number) {
  const job = vectorSyncRepository.createBackfillJob();
  vectorSyncRepository.markJobRunning(job.id);

  try {
    const deleteResult = await processDeleteJobs(limit);
    const upsertResult = await processPendingChunkBatch(limit);

    vectorSyncRepository.markJobCompleted(job.id);

    return {
      deletedChunkCount: deleteResult.deletedCount,
      processedChunkCount: upsertResult.processedChunkCount,
    };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    const pendingChunks = vectorSyncRepository.listPendingQaChunkSyncBatch(limit);
    const embeddingConfig = await resolveOpenClawEmbeddingConfig();

    for (const chunk of pendingChunks) {
      vectorSyncRepository.markChunkSyncFailed({
        chunkId: chunk.id,
        contentHash: chunk.contentHash,
        errorMessage,
        embeddingProvider: "openclaw",
        embeddingModel: embeddingConfig.model,
      });
    }

    vectorSyncRepository.markJobFailed(job.id, errorMessage);

    return {
      deletedChunkCount: 0,
      processedChunkCount: 0,
      errorMessage,
    };
  }
}

export const qaMilvusFoundationService = {
  async prepare(options?: {
    runSync?: boolean;
    maxChunks?: number;
    refreshCorpus?: boolean;
  }) {
    const milvusConfig = getMilvusConfig();
    const corpus =
      options?.refreshCorpus === false
        ? await readCurrentQaFoundationState()
        : await reconcileQaCorpus();
    const batchLimit = Math.max(
      1,
      Math.min(options?.maxChunks ?? milvusConfig.syncBatchSize, milvusConfig.syncBatchSize),
    );
    const syncResult =
      options?.runSync && milvusConfig.enabled
        ? await runSyncBatch(batchLimit)
        : {
            deletedChunkCount: 0,
            processedChunkCount: 0,
          };
    const stats = vectorSyncRepository.getQaFoundationStats();
    const milvusHealth = await milvusVectorBackend.getHealthSnapshot();
    const warnings = buildWarnings({
      milvusEnabled: milvusConfig.enabled,
      pendingSyncCount: stats.pendingSyncCount,
      failedSyncCount: stats.failedSyncCount,
      failedEmbeddingCount: stats.failedEmbeddingCount,
      healthStatus: milvusHealth.status,
      healthError: "error" in milvusHealth ? milvusHealth.error : undefined,
    });
    const foundationStatus: "ok" | "pending" | "disabled" | "degraded" =
      milvusHealth.status === "disabled"
        ? "disabled"
        : milvusHealth.status === "degraded"
          ? "degraded"
          : stats.failedEmbeddingCount > 0 || stats.failedSyncCount > 0
            ? "degraded"
            : stats.pendingSyncCount > 0
              ? "pending"
              : "ok";

    return {
      backend: "milvus" as const,
      enabled: milvusConfig.enabled,
      status: foundationStatus,
      collectionName: milvusConfig.collectionName,
      dimension: milvusConfig.dimension,
      batchLimit,
      questionChunkCount: corpus.syncQuestionChunks.questionChunkCount,
      answerChunkCount:
        corpus.syncQuestionChunks.answerChunkCount + corpus.syncAnswerVariantChunks.chunkCount,
      sourceExcerptChunkCount: corpus.syncSourceExcerptChunks.chunkCount,
      pendingChunkCount: corpus.reconcileResult.pendingChunkCount,
      readyChunkCount: corpus.reconcileResult.readyChunkCount,
      pendingEmbeddingCount: stats.pendingEmbeddingCount,
      readyEmbeddingCount: stats.readyEmbeddingCount,
      failedEmbeddingCount: stats.failedEmbeddingCount,
      pendingSyncCount: stats.pendingSyncCount,
      syncedDocumentCount: stats.syncedDocumentCount,
      failedSyncCount: stats.failedSyncCount,
      pendingDeleteJobCount: stats.pendingDeleteJobCount,
      deletedChunkCount: syncResult.deletedChunkCount,
      processedChunkCount: syncResult.processedChunkCount,
      latestJob: stats.latestJob ?? null,
      warnings,
      health: milvusHealth,
      embeddingProvider: "openclaw",
      embeddingModel: corpus.embeddingConfig.model,
      errorMessage: "errorMessage" in syncResult ? syncResult.errorMessage : null,
    };
  },
};

export type QaMilvusFoundationSnapshot = Awaited<
  ReturnType<typeof qaMilvusFoundationService.prepare>
>;
