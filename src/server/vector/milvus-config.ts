const defaultMilvusBaseUrl = "http://127.0.0.1:19530";
const defaultMilvusCollectionName = "oi_qa_chunks_v1";
const defaultMilvusRequestTimeoutMs = 15_000;
const defaultMilvusBatchSize = 8;
const defaultMilvusDimension = 1536;

type MilvusMetricType = "COSINE" | "IP" | "L2";

function trimNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function parsePositiveInteger(
  value: string | undefined,
  fallbackValue: number,
  minimumValue = 1,
) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < minimumValue) {
    return fallbackValue;
  }

  return Math.floor(parsedValue);
}

function parseMetricType(value: string | undefined): MilvusMetricType {
  if (value === "IP" || value === "L2") {
    return value;
  }

  return "COSINE";
}

export type MilvusConfig = {
  enabled: boolean;
  baseUrl: string;
  token: string | null;
  databaseName: string;
  collectionName: string;
  primaryFieldName: string;
  vectorFieldName: string;
  dimension: number;
  metricType: MilvusMetricType;
  requestTimeoutMs: number;
  syncBatchSize: number;
};

export function getMilvusConfig(): MilvusConfig {
  const configuredBaseUrl =
    trimNullable(process.env.MILVUS_BASE_URL) ??
    trimNullable(process.env.MILVUS_ADDRESS) ??
    defaultMilvusBaseUrl;

  return {
    enabled: process.env.MILVUS_ENABLED === "1",
    baseUrl: configuredBaseUrl.replace(/\/+$/u, ""),
    token: trimNullable(process.env.MILVUS_TOKEN) ?? "",
    databaseName: trimNullable(process.env.MILVUS_DB_NAME) ?? "default",
    collectionName:
      trimNullable(process.env.MILVUS_COLLECTION_QA) ?? defaultMilvusCollectionName,
    primaryFieldName: "chunk_id",
    vectorFieldName: "embedding",
    dimension: parsePositiveInteger(
      process.env.MILVUS_VECTOR_DIM ?? process.env.EMBEDDING_DIMENSIONS,
      defaultMilvusDimension,
    ),
    metricType: parseMetricType(process.env.MILVUS_METRIC_TYPE),
    requestTimeoutMs: parsePositiveInteger(
      process.env.MILVUS_REQUEST_TIMEOUT_MS,
      defaultMilvusRequestTimeoutMs,
      100,
    ),
    syncBatchSize: parsePositiveInteger(
      process.env.MILVUS_SYNC_BATCH_SIZE,
      defaultMilvusBatchSize,
    ),
  };
}
