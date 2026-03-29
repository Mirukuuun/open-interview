import { getMilvusConfig } from "@/server/vector/milvus-config";
import {
  getQaMilvusCollectionSpec,
  type QaMilvusVectorDocument,
} from "@/server/vector/milvus-schema";

type MilvusApiSuccess<T> = {
  code: number;
  data?: T;
  message?: string;
};

type MilvusCollectionHasResponse =
  | {
      has: boolean;
    }
  | boolean
  | null
  | undefined;

type MilvusSearchHitPayload = {
  id?: unknown;
  distance?: unknown;
  score?: unknown;
  entity?: Record<string, unknown>;
  chunk_id?: unknown;
  owner_type?: unknown;
  owner_id?: unknown;
  chunk_type?: unknown;
  source_order?: unknown;
  token_count?: unknown;
  updated_at?: unknown;
  content_hash?: unknown;
};

function toStringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumberValue(value: unknown) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function flattenSearchHits(payload: unknown): MilvusSearchHitPayload[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenSearchHits(item));
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidate = payload as Record<string, unknown>;

  if ("searchResults" in candidate) {
    return flattenSearchHits(candidate.searchResults);
  }

  if ("results" in candidate) {
    return flattenSearchHits(candidate.results);
  }

  if ("result" in candidate) {
    return flattenSearchHits(candidate.result);
  }

  const hitCandidate = payload as MilvusSearchHitPayload;

  if (
    hitCandidate.id !== undefined ||
    hitCandidate.chunk_id !== undefined ||
    hitCandidate.entity !== undefined
  ) {
    return [hitCandidate];
  }

  return [];
}

function parseSearchHits(payload: unknown) {
  return flattenSearchHits(payload)
    .map((hit) => {
      const entity = hit.entity ?? {};
      const chunkId =
        toStringValue(hit.id) ??
        toStringValue(hit.chunk_id) ??
        toStringValue((entity as Record<string, unknown>).chunk_id);

      if (!chunkId) {
        return null;
      }

      return {
        chunkId,
        ownerType:
          toStringValue(hit.owner_type) ??
          toStringValue((entity as Record<string, unknown>).owner_type),
        ownerId:
          toStringValue(hit.owner_id) ??
          toStringValue((entity as Record<string, unknown>).owner_id),
        chunkType:
          toStringValue(hit.chunk_type) ??
          toStringValue((entity as Record<string, unknown>).chunk_type),
        score:
          toNumberValue(hit.score) ??
          toNumberValue(hit.distance) ??
          0,
      };
    })
    .filter(
      (
        hit,
      ): hit is {
        chunkId: string;
        ownerType: string | null;
        ownerId: string | null;
        chunkType: string | null;
        score: number;
      } => hit !== null,
    );
}

export class MilvusVectorBackendError extends Error {
  code: "disabled" | "transport_error" | "http_error" | "response_error";
  statusCode?: number;
  details?: unknown;

  constructor(
    code: MilvusVectorBackendError["code"],
    message: string,
    statusCode?: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "MilvusVectorBackendError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function getRequestTimeoutHeader(timeoutMs: number) {
  return {
    "Request-Timeout": `${Math.max(0, Math.ceil(timeoutMs / 1000))}`,
  };
}

function parseCollectionExists(payload: MilvusCollectionHasResponse) {
  if (typeof payload === "boolean") {
    return payload;
  }

  if (payload && typeof payload === "object" && "has" in payload) {
    return Boolean(payload.has);
  }

  return false;
}

function parseUpsertCount(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return 0;
  }

  const candidate = payload as {
    upsertCount?: unknown;
    upsert_count?: unknown;
    upsertCnt?: unknown;
  };

  return Number(candidate.upsertCount ?? candidate.upsert_count ?? candidate.upsertCnt ?? 0);
}

async function milvusRequest<TResponse>(
  path: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const config = getMilvusConfig();
  const controller = AbortSignal.timeout(config.requestTimeoutMs);
  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...getRequestTimeoutHeader(config.requestTimeoutMs),
        ...(config.token ? { authorization: `Bearer ${config.token}` } : {}),
      },
      body: JSON.stringify({
        dbName: config.databaseName,
        ...body,
      }),
      signal: controller,
    });
  } catch (error) {
    throw new MilvusVectorBackendError(
      "transport_error",
      error instanceof Error ? error.message : "Milvus transport failed.",
      undefined,
      error,
    );
  }

  let payload: MilvusApiSuccess<TResponse>;

  try {
    payload = (await response.json()) as MilvusApiSuccess<TResponse>;
  } catch (error) {
    throw new MilvusVectorBackendError(
      "response_error",
      "Milvus returned a non-JSON response.",
      response.status,
      error,
    );
  }

  if (!response.ok || payload.code !== 0) {
    throw new MilvusVectorBackendError(
      "http_error",
      payload.message ?? `Milvus request failed with status ${response.status}.`,
      response.status,
      payload,
    );
  }

  return (payload.data ?? {}) as TResponse;
}

async function hasQaCollection() {
  const config = getMilvusConfig();

  const payload = await milvusRequest<MilvusCollectionHasResponse>(
    "/v2/vectordb/collections/has",
    {
      collectionName: config.collectionName,
    },
  );

  return parseCollectionExists(payload);
}

export const milvusVectorBackend = {
  isEnabled() {
    return getMilvusConfig().enabled;
  },

  async ensureQaCollection() {
    const config = getMilvusConfig();

    if (!config.enabled) {
      throw new MilvusVectorBackendError(
        "disabled",
        "Milvus backend is disabled. Set MILVUS_ENABLED=1 to enable it.",
      );
    }

    const exists = await hasQaCollection();

    if (!exists) {
      const collectionSpec = getQaMilvusCollectionSpec();

      await milvusRequest("/v2/vectordb/collections/create", {
        collectionName: collectionSpec.collectionName,
        schema: collectionSpec.schema,
        indexParams: collectionSpec.indexParams,
      });
    }

    await milvusRequest("/v2/vectordb/collections/load", {
      collectionName: config.collectionName,
    });

    return {
      collectionName: config.collectionName,
      created: !exists,
    };
  },

  async upsertQaDocuments(documents: QaMilvusVectorDocument[]) {
    const config = getMilvusConfig();

    if (!config.enabled) {
      throw new MilvusVectorBackendError(
        "disabled",
        "Milvus backend is disabled. Set MILVUS_ENABLED=1 to enable it.",
      );
    }

    if (documents.length === 0) {
      return {
        upsertedCount: 0,
      };
    }

    await this.ensureQaCollection();

    const payload = await milvusRequest<{
      upsertCount?: number;
      upsert_count?: number;
      upsertCnt?: number;
    }>("/v2/vectordb/entities/upsert", {
      collectionName: config.collectionName,
      data: documents,
    });

    return {
      upsertedCount: parseUpsertCount(payload) || documents.length,
    };
  },

  async deleteQaDocument(chunkId: string) {
    const config = getMilvusConfig();

    if (!config.enabled) {
      throw new MilvusVectorBackendError(
        "disabled",
        "Milvus backend is disabled. Set MILVUS_ENABLED=1 to enable it.",
      );
    }

    const exists = await hasQaCollection();

    if (!exists) {
      return {
        deleted: false,
      };
    }

    await milvusRequest("/v2/vectordb/entities/delete", {
      collectionName: config.collectionName,
      filter: `${config.primaryFieldName} == "${chunkId.replace(/"/g, '\\"')}"`,
    });

    return {
      deleted: true,
    };
  },

  async getHealthSnapshot() {
    const config = getMilvusConfig();

    if (!config.enabled) {
      return {
        backend: "milvus" as const,
        enabled: false,
        status: "disabled" as const,
        baseUrl: config.baseUrl,
        collectionName: config.collectionName,
        dimension: config.dimension,
      };
    }

    try {
      const exists = await hasQaCollection();

      return {
        backend: "milvus" as const,
        enabled: true,
        status: "ok" as const,
        baseUrl: config.baseUrl,
        collectionName: config.collectionName,
        dimension: config.dimension,
        collectionExists: exists,
      };
    } catch (error) {
      return {
        backend: "milvus" as const,
        enabled: true,
        status: "degraded" as const,
        baseUrl: config.baseUrl,
        collectionName: config.collectionName,
        dimension: config.dimension,
        error:
          error instanceof Error ? error.message : "Milvus health probe failed unexpectedly.",
      };
    }
  },

  async searchQaDocuments(input: {
    vector: number[];
    topK: number;
    filter?: string;
  }) {
    const config = getMilvusConfig();

    if (!config.enabled) {
      throw new MilvusVectorBackendError(
        "disabled",
        "Milvus backend is disabled. Set MILVUS_ENABLED=1 to enable it.",
      );
    }

    if (input.vector.length === 0) {
      return [];
    }

    await this.ensureQaCollection();

    const payload = await milvusRequest<unknown>("/v2/vectordb/entities/search", {
      collectionName: config.collectionName,
      data: [input.vector],
      annsField: config.vectorFieldName,
      limit: input.topK,
      outputFields: [
        "owner_type",
        "owner_id",
        "chunk_type",
      ],
      ...(input.filter ? { filter: input.filter } : {}),
    });

    return parseSearchHits(payload);
  },
};
