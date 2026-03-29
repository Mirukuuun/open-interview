import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import {
  chunkEmbeddingStatuses,
  chunkOwnerTypes,
  chunkTypes,
  createdAtColumn,
  idColumn,
  nullableIntegerColumn,
  retrievalQueryTypes,
  retrievalStrategies,
  updatedAtColumn,
  vectorBackends,
  vectorSyncJobStatuses,
  vectorSyncJobTypes,
  vectorSyncStatuses,
} from "@/server/db/schema/_common";

// SQLite 继续保存 retrieval chunk 元数据和同步状态；
// Milvus 只做向量索引层，不替代业务真相源。
export const chunks = sqliteTable(
  "chunks",
  {
    id: idColumn(),
    ownerType: text("owner_type", { enum: chunkOwnerTypes }).notNull(),
    ownerId: text("owner_id").notNull(),
    chunkType: text("chunk_type", { enum: chunkTypes }).notNull(),
    content: text("content").notNull(),
    tokenCount: nullableIntegerColumn("token_count"),
    sourceOrder: nullableIntegerColumn("source_order"),
    embeddingStatus: text("embedding_status", { enum: chunkEmbeddingStatuses })
      .notNull()
      .default("pending"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("chunks_owner_idx").on(table.ownerType, table.ownerId),
    index("chunks_embedding_status_idx").on(table.embeddingStatus),
  ],
);

export const chunkEmbeddings = sqliteTable(
  "chunk_embeddings",
  {
    id: idColumn(),
    chunkId: text("chunk_id")
      .notNull()
      .references(() => chunks.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    contentHash: text("content_hash").notNull(),
    status: text("status", { enum: chunkEmbeddingStatuses })
      .notNull()
      .default("pending"),
    dims: nullableIntegerColumn("dims"),
    lastEmbeddedAt: text("last_embedded_at"),
    lastError: text("last_error"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("chunk_embeddings_chunk_id_uq").on(table.chunkId),
    index("chunk_embeddings_status_idx").on(table.status),
    index("chunk_embeddings_provider_model_idx").on(table.provider, table.model),
  ],
);

export const chunkVectorSyncStates = sqliteTable(
  "chunk_vector_sync_states",
  {
    id: idColumn(),
    chunkId: text("chunk_id")
      .notNull()
      .references(() => chunks.id, { onDelete: "cascade" }),
    backend: text("backend", { enum: vectorBackends }).notNull().default("milvus"),
    collectionName: text("collection_name").notNull(),
    documentId: text("document_id").notNull(),
    contentHash: text("content_hash").notNull(),
    syncStatus: text("sync_status", { enum: vectorSyncStatuses })
      .notNull()
      .default("pending"),
    lastSyncedAt: text("last_synced_at"),
    lastError: text("last_error"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("chunk_vector_sync_states_chunk_backend_uq").on(
      table.chunkId,
      table.backend,
    ),
    index("chunk_vector_sync_states_status_idx").on(table.syncStatus),
    index("chunk_vector_sync_states_collection_idx").on(table.collectionName),
  ],
);

export const vectorSyncJobs = sqliteTable(
  "vector_sync_jobs",
  {
    id: idColumn(),
    backend: text("backend", { enum: vectorBackends }).notNull().default("milvus"),
    jobType: text("job_type", { enum: vectorSyncJobTypes }).notNull(),
    status: text("status", { enum: vectorSyncJobStatuses })
      .notNull()
      .default("pending"),
    collectionName: text("collection_name").notNull(),
    targetChunkId: text("target_chunk_id"),
    targetOwnerType: text("target_owner_type", { enum: chunkOwnerTypes }),
    targetOwnerId: text("target_owner_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("vector_sync_jobs_status_idx").on(table.status),
    index("vector_sync_jobs_backend_idx").on(table.backend),
    index("vector_sync_jobs_type_idx").on(table.jobType),
    index("vector_sync_jobs_chunk_idx").on(table.targetChunkId),
  ],
);

export const retrievalLogs = sqliteTable(
  "retrieval_logs",
  {
    id: idColumn(),
    queryText: text("query_text").notNull(),
    queryType: text("query_type", { enum: retrievalQueryTypes }).notNull(),
    strategy: text("strategy", { enum: retrievalStrategies }).notNull(),
    hitsJson: text("hits_json").notNull(),
    finalContextJson: text("final_context_json").notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("retrieval_logs_query_type_idx").on(table.queryType),
    index("retrieval_logs_strategy_idx").on(table.strategy),
  ],
);
