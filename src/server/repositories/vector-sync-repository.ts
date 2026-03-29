import { createHash } from "node:crypto";

import { and, asc, count, desc, eq, inArray, or } from "drizzle-orm";

import { db } from "@/server/db/client";
import {
  chunkEmbeddings,
  chunks,
  chunkVectorSyncStates,
  vectorSyncJobs,
} from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";
import { getMilvusConfig } from "@/server/vector/milvus-config";

/**
 * [POS] 维护 SQLite 侧的 embedding-state、Milvus sync-state 和 delete/backfill job skeleton。
 * [IN] 已持久化的 retrieval chunks 与当前 Milvus / embedding 配置。
 * [OUT] 产出待同步批次、同步统计和持久化的 job / 状态更新。
 *
 * @feature open-interview-server-core-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

const qaChunkTypes = ["question", "answer", "source_excerpt"] as const;

type QaChunkRecord = {
  id: string;
  ownerType: "source_document" | "question_item" | "answer_variant" | "resume_project";
  ownerId: string;
  chunkType: "source_excerpt" | "question" | "answer" | "project_summary";
  content: string;
  tokenCount: number | null;
  sourceOrder: number | null;
  updatedAt: string;
};

function buildContentHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function getCollectionName() {
  return getMilvusConfig().collectionName;
}

function updateChunkEmbeddingStatus(
  chunkId: string,
  status: "pending" | "ready" | "failed",
) {
  db.update(chunks).set({ embeddingStatus: status }).where(eq(chunks.id, chunkId)).run();
}

export const vectorSyncRepository = {
  buildContentHash,

  reconcileQaChunks(input: {
    chunks: QaChunkRecord[];
    embeddingProvider: string;
    embeddingModel: string;
  }) {
    const timestamp = nowUtcIso();
    const collectionName = getCollectionName();
    const chunkIds = input.chunks.map((chunk) => chunk.id);
    const embeddingMap = new Map(
      (chunkIds.length === 0
        ? []
        : db
            .select()
            .from(chunkEmbeddings)
            .where(inArray(chunkEmbeddings.chunkId, chunkIds))
            .all()
      ).map((row) => [row.chunkId, row]),
    );
    const syncStateMap = new Map(
      (chunkIds.length === 0
        ? []
        : db
            .select()
            .from(chunkVectorSyncStates)
            .where(inArray(chunkVectorSyncStates.chunkId, chunkIds))
            .all()
      ).map((row) => [row.chunkId, row]),
    );
    let pendingChunkCount = 0;
    let readyChunkCount = 0;

    for (const chunk of input.chunks) {
      const contentHash = buildContentHash(chunk.content);
      const embeddingRow = embeddingMap.get(chunk.id);
      const syncRow = syncStateMap.get(chunk.id);
      const needsEmbeddingRefresh =
        !embeddingRow ||
        embeddingRow.provider !== input.embeddingProvider ||
        embeddingRow.model !== input.embeddingModel ||
        embeddingRow.contentHash !== contentHash ||
        embeddingRow.status !== "ready";
      const needsVectorRefresh =
        !syncRow ||
        syncRow.collectionName !== collectionName ||
        syncRow.documentId !== chunk.id ||
        syncRow.contentHash !== contentHash ||
        syncRow.syncStatus !== "synced";

      if (needsEmbeddingRefresh) {
        db.insert(chunkEmbeddings)
          .values({
            id: embeddingRow?.id ?? createOpaqueId("cemb"),
            chunkId: chunk.id,
            provider: input.embeddingProvider,
            model: input.embeddingModel,
            contentHash,
            status: "pending",
            dims: null,
            lastEmbeddedAt: null,
            lastError: null,
            createdAt: embeddingRow?.createdAt ?? timestamp,
            updatedAt: timestamp,
          })
          .onConflictDoUpdate({
            target: chunkEmbeddings.chunkId,
            set: {
              provider: input.embeddingProvider,
              model: input.embeddingModel,
              contentHash,
              status: "pending",
              dims: null,
              lastEmbeddedAt: null,
              lastError: null,
              updatedAt: timestamp,
            },
          })
          .run();
      }

      if (needsEmbeddingRefresh || needsVectorRefresh) {
        db.insert(chunkVectorSyncStates)
          .values({
            id: syncRow?.id ?? createOpaqueId("vsync"),
            chunkId: chunk.id,
            backend: "milvus",
            collectionName,
            documentId: chunk.id,
            contentHash,
            syncStatus: "pending",
            lastSyncedAt: null,
            lastError: null,
            createdAt: syncRow?.createdAt ?? timestamp,
            updatedAt: timestamp,
          })
          .onConflictDoUpdate({
            target: [
              chunkVectorSyncStates.chunkId,
              chunkVectorSyncStates.backend,
            ],
            set: {
              collectionName,
              documentId: chunk.id,
              contentHash,
              syncStatus: "pending",
              lastSyncedAt: null,
              lastError: null,
              updatedAt: timestamp,
            },
          })
          .run();
      }

      if (needsEmbeddingRefresh || needsVectorRefresh) {
        updateChunkEmbeddingStatus(chunk.id, "pending");
        pendingChunkCount += 1;
      } else {
        updateChunkEmbeddingStatus(chunk.id, "ready");
        readyChunkCount += 1;
      }
    }

    return {
      pendingChunkCount,
      readyChunkCount,
      collectionName,
    };
  },

  listPendingQaChunkSyncBatch(limit: number) {
    return db
      .select({
        id: chunks.id,
        ownerType: chunks.ownerType,
        ownerId: chunks.ownerId,
        chunkType: chunks.chunkType,
        content: chunks.content,
        tokenCount: chunks.tokenCount,
        sourceOrder: chunks.sourceOrder,
        updatedAt: chunks.updatedAt,
        contentHash: chunkEmbeddings.contentHash,
      })
      .from(chunks)
      .innerJoin(chunkEmbeddings, eq(chunkEmbeddings.chunkId, chunks.id))
      .innerJoin(
        chunkVectorSyncStates,
        and(
          eq(chunkVectorSyncStates.chunkId, chunks.id),
          eq(chunkVectorSyncStates.backend, "milvus"),
        ),
      )
      .where(
        and(
          inArray(chunks.chunkType, qaChunkTypes),
          eq(chunks.embeddingStatus, "pending"),
          or(
            eq(chunkEmbeddings.status, "pending"),
            eq(chunkEmbeddings.status, "failed"),
            eq(chunkVectorSyncStates.syncStatus, "pending"),
            eq(chunkVectorSyncStates.syncStatus, "failed"),
          ),
        ),
      )
      .orderBy(asc(chunks.updatedAt), asc(chunks.id))
      .limit(limit)
      .all();
  },

  markChunkSynced(input: {
    chunkId: string;
    contentHash: string;
    dims: number;
    embeddingProvider: string;
    embeddingModel: string;
  }) {
    const timestamp = nowUtcIso();
    const collectionName = getCollectionName();

    db.update(chunkEmbeddings)
      .set({
        provider: input.embeddingProvider,
        model: input.embeddingModel,
        contentHash: input.contentHash,
        status: "ready",
        dims: input.dims,
        lastEmbeddedAt: timestamp,
        lastError: null,
        updatedAt: timestamp,
      })
      .where(eq(chunkEmbeddings.chunkId, input.chunkId))
      .run();

    db.update(chunkVectorSyncStates)
      .set({
        collectionName,
        documentId: input.chunkId,
        contentHash: input.contentHash,
        syncStatus: "synced",
        lastSyncedAt: timestamp,
        lastError: null,
        updatedAt: timestamp,
      })
      .where(
        and(
          eq(chunkVectorSyncStates.chunkId, input.chunkId),
          eq(chunkVectorSyncStates.backend, "milvus"),
        ),
      )
      .run();

    updateChunkEmbeddingStatus(input.chunkId, "ready");
  },

  markChunkSyncFailed(input: {
    chunkId: string;
    contentHash: string;
    errorMessage: string;
    embeddingProvider: string;
    embeddingModel: string;
  }) {
    const timestamp = nowUtcIso();
    const collectionName = getCollectionName();

    db.update(chunkEmbeddings)
      .set({
        provider: input.embeddingProvider,
        model: input.embeddingModel,
        contentHash: input.contentHash,
        status: "failed",
        lastError: input.errorMessage,
        updatedAt: timestamp,
      })
      .where(eq(chunkEmbeddings.chunkId, input.chunkId))
      .run();

    db.update(chunkVectorSyncStates)
      .set({
        collectionName,
        documentId: input.chunkId,
        contentHash: input.contentHash,
        syncStatus: "failed",
        lastError: input.errorMessage,
        updatedAt: timestamp,
      })
      .where(
        and(
          eq(chunkVectorSyncStates.chunkId, input.chunkId),
          eq(chunkVectorSyncStates.backend, "milvus"),
        ),
      )
      .run();

    updateChunkEmbeddingStatus(input.chunkId, "failed");
  },

  enqueueChunkDelete(input: {
    chunkId: string;
  }) {
    const timestamp = nowUtcIso();

    db.insert(vectorSyncJobs)
      .values({
        id: createOpaqueId("vsjob"),
        backend: "milvus",
        jobType: "delete_chunk",
        status: "pending",
        collectionName: getCollectionName(),
        targetChunkId: input.chunkId,
        targetOwnerType: null,
        targetOwnerId: null,
        attemptCount: 0,
        lastError: null,
        startedAt: null,
        finishedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  },

  listPendingDeleteJobs(limit: number) {
    return db
      .select()
      .from(vectorSyncJobs)
      .where(
        and(
          eq(vectorSyncJobs.backend, "milvus"),
          eq(vectorSyncJobs.jobType, "delete_chunk"),
          eq(vectorSyncJobs.status, "pending"),
        ),
      )
      .orderBy(asc(vectorSyncJobs.createdAt), asc(vectorSyncJobs.id))
      .limit(limit)
      .all();
  },

  createBackfillJob() {
    const timestamp = nowUtcIso();
    const job = {
      id: createOpaqueId("vsjob"),
      backend: "milvus" as const,
      jobType: "backfill" as const,
      status: "pending" as const,
      collectionName: getCollectionName(),
      targetChunkId: null,
      targetOwnerType: null,
      targetOwnerId: null,
      attemptCount: 0,
      lastError: null,
      startedAt: null,
      finishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.insert(vectorSyncJobs).values(job).run();

    return job;
  },

  markJobRunning(jobId: string) {
    const timestamp = nowUtcIso();
    const currentAttemptCount =
      db
        .select({
          attemptCount: vectorSyncJobs.attemptCount,
        })
        .from(vectorSyncJobs)
        .where(eq(vectorSyncJobs.id, jobId))
        .all()[0]?.attemptCount ?? 0;

    db.update(vectorSyncJobs)
      .set({
        status: "running",
        attemptCount: currentAttemptCount + 1,
        startedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(vectorSyncJobs.id, jobId))
      .run();
  },

  markJobCompleted(jobId: string) {
    const timestamp = nowUtcIso();

    db.update(vectorSyncJobs)
      .set({
        status: "completed",
        lastError: null,
        finishedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(vectorSyncJobs.id, jobId))
      .run();
  },

  markJobFailed(jobId: string, errorMessage: string) {
    const timestamp = nowUtcIso();

    db.update(vectorSyncJobs)
      .set({
        status: "failed",
        lastError: errorMessage,
        finishedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(vectorSyncJobs.id, jobId))
      .run();
  },

  markDeleteJobRunning(jobId: string) {
    const timestamp = nowUtcIso();
    const currentAttemptCount =
      db
        .select({
          attemptCount: vectorSyncJobs.attemptCount,
        })
        .from(vectorSyncJobs)
        .where(eq(vectorSyncJobs.id, jobId))
        .all()[0]?.attemptCount ?? 0;

    db.update(vectorSyncJobs)
      .set({
        status: "running",
        attemptCount: currentAttemptCount + 1,
        startedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(vectorSyncJobs.id, jobId))
      .run();
  },

  getQaFoundationStats() {
    const pendingEmbeddingCount = Number(
      db
        .select({ count: count() })
        .from(chunkEmbeddings)
        .where(eq(chunkEmbeddings.status, "pending"))
        .all()[0]?.count ?? 0,
    );
    const readyEmbeddingCount = Number(
      db
        .select({ count: count() })
        .from(chunkEmbeddings)
        .where(eq(chunkEmbeddings.status, "ready"))
        .all()[0]?.count ?? 0,
    );
    const failedEmbeddingCount = Number(
      db
        .select({ count: count() })
        .from(chunkEmbeddings)
        .where(eq(chunkEmbeddings.status, "failed"))
        .all()[0]?.count ?? 0,
    );
    const pendingSyncCount = Number(
      db
        .select({ count: count() })
        .from(chunkVectorSyncStates)
        .where(eq(chunkVectorSyncStates.syncStatus, "pending"))
        .all()[0]?.count ?? 0,
    );
    const syncedDocumentCount = Number(
      db
        .select({ count: count() })
        .from(chunkVectorSyncStates)
        .where(eq(chunkVectorSyncStates.syncStatus, "synced"))
        .all()[0]?.count ?? 0,
    );
    const failedSyncCount = Number(
      db
        .select({ count: count() })
        .from(chunkVectorSyncStates)
        .where(eq(chunkVectorSyncStates.syncStatus, "failed"))
        .all()[0]?.count ?? 0,
    );
    const pendingDeleteJobCount = Number(
      db
        .select({ count: count() })
        .from(vectorSyncJobs)
        .where(
          and(
            eq(vectorSyncJobs.backend, "milvus"),
            eq(vectorSyncJobs.jobType, "delete_chunk"),
            inArray(vectorSyncJobs.status, ["pending", "running"]),
          ),
        )
        .all()[0]?.count ?? 0,
    );
    const latestJob = db
      .select({
        id: vectorSyncJobs.id,
        jobType: vectorSyncJobs.jobType,
        status: vectorSyncJobs.status,
        collectionName: vectorSyncJobs.collectionName,
        attemptCount: vectorSyncJobs.attemptCount,
        lastError: vectorSyncJobs.lastError,
        createdAt: vectorSyncJobs.createdAt,
        updatedAt: vectorSyncJobs.updatedAt,
      })
      .from(vectorSyncJobs)
      .where(eq(vectorSyncJobs.backend, "milvus"))
      .orderBy(desc(vectorSyncJobs.updatedAt), desc(vectorSyncJobs.id))
      .limit(1)
      .all()[0];

    return {
      pendingEmbeddingCount,
      readyEmbeddingCount,
      failedEmbeddingCount,
      pendingSyncCount,
      syncedDocumentCount,
      failedSyncCount,
      pendingDeleteJobCount,
      latestJob,
    };
  },
};
