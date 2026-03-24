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
} from "@/server/db/schema/_common";

// SQLite FTS5 virtual tables 有意延后到 search slice 再落地。
// Slice 1 先落结构化 retrieval 表，这样后续 slice 可以补齐
// chunks、embeddings 和 retrieval traces，而不需要重塑 core schema。
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

export const embeddings = sqliteTable(
  "embeddings",
  {
    id: idColumn(),
    chunkId: text("chunk_id")
      .notNull()
      .references(() => chunks.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    vectorJson: text("vector_json").notNull(),
    dims: integer("dims").notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [uniqueIndex("embeddings_chunk_id_uq").on(table.chunkId)],
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
