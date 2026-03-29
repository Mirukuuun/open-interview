import { getMilvusConfig } from "@/server/vector/milvus-config";

/**
 * [POS] 定义 QA retrieval chunks 在 Milvus 中的 collection schema、metadata boundary 和 stable document shape。
 * [IN] SQLite chunks 与当前 Milvus config。
 * [OUT] Milvus collection spec，以及 chunk -> vector document 的映射。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

const chunkIdMaxLength = 96;
const ownerIdMaxLength = 96;
const ownerTypeMaxLength = 32;
const chunkTypeMaxLength = 32;
const isoTimestampMaxLength = 40;
const contentHashLength = 64;

export type QaMilvusVectorDocument = {
  chunk_id: string;
  embedding: number[];
  owner_type: string;
  owner_id: string;
  chunk_type: string;
  source_order: number;
  token_count: number;
  updated_at: string;
  content_hash: string;
};

export function getQaMilvusCollectionSpec() {
  const config = getMilvusConfig();

  return {
    collectionName: config.collectionName,
    primaryFieldName: config.primaryFieldName,
    vectorFieldName: config.vectorFieldName,
    metricType: config.metricType,
    schema: {
      autoID: false,
      enableDynamicField: false,
      fields: [
        {
          fieldName: config.primaryFieldName,
          dataType: "VarChar",
          isPrimary: true,
          elementTypeParams: {
            max_length: chunkIdMaxLength,
          },
        },
        {
          fieldName: config.vectorFieldName,
          dataType: "FloatVector",
          elementTypeParams: {
            dim: config.dimension,
          },
        },
        {
          fieldName: "owner_type",
          dataType: "VarChar",
          elementTypeParams: {
            max_length: ownerTypeMaxLength,
          },
        },
        {
          fieldName: "owner_id",
          dataType: "VarChar",
          elementTypeParams: {
            max_length: ownerIdMaxLength,
          },
        },
        {
          fieldName: "chunk_type",
          dataType: "VarChar",
          elementTypeParams: {
            max_length: chunkTypeMaxLength,
          },
        },
        {
          fieldName: "source_order",
          dataType: "Int64",
        },
        {
          fieldName: "token_count",
          dataType: "Int64",
        },
        {
          fieldName: "updated_at",
          dataType: "VarChar",
          elementTypeParams: {
            max_length: isoTimestampMaxLength,
          },
        },
        {
          fieldName: "content_hash",
          dataType: "VarChar",
          elementTypeParams: {
            max_length: contentHashLength,
          },
        },
      ],
    },
    indexParams: [
      {
        fieldName: config.vectorFieldName,
        indexName: `${config.vectorFieldName}_autindex`,
        metricType: config.metricType,
        params: {
          index_type: "AUTOINDEX",
        },
      },
    ],
  };
}

export function buildQaMilvusVectorDocument(input: {
  chunk: {
    id: string;
    ownerType: string;
    ownerId: string;
    chunkType: string;
    sourceOrder: number | null;
    tokenCount: number | null;
    updatedAt: string;
  };
  embedding: number[];
  contentHash: string;
}) {
  return {
    chunk_id: input.chunk.id,
    embedding: input.embedding,
    owner_type: input.chunk.ownerType,
    owner_id: input.chunk.ownerId,
    chunk_type: input.chunk.chunkType,
    source_order: input.chunk.sourceOrder ?? 0,
    token_count: input.chunk.tokenCount ?? 0,
    updated_at: input.chunk.updatedAt,
    content_hash: input.contentHash,
  } satisfies QaMilvusVectorDocument;
}
