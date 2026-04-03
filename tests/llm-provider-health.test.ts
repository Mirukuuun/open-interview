import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createJsonObjectMock,
  prepareMock,
  MockOpenClawResponsesClientError,
} = vi.hoisted(() => {
  class MockOpenClawResponsesClientError extends Error {
    code:
      | "provider_config_error"
      | "provider_transport_error"
      | "provider_timeout"
      | "provider_http_error"
      | "provider_response_error"
      | "provider_response_shape_error"
      | "invalid_json";
    statusCode?: number;
    details?: unknown;

    constructor(
      code: MockOpenClawResponsesClientError["code"],
      message: string,
      statusCode?: number,
      details?: unknown,
    ) {
      super(message);
      this.name = "OpenClawResponsesClientError";
      this.code = code;
      this.statusCode = statusCode;
      this.details = details;
    }
  }

  return {
    createJsonObjectMock: vi.fn(),
    prepareMock: vi.fn(),
    MockOpenClawResponsesClientError,
  };
});

vi.mock("../src/server/adapters/openclaw/llm-client", () => ({
  openClawLlmClient: {
    createJsonObject: createJsonObjectMock,
  },
  OpenClawResponsesClientError: MockOpenClawResponsesClientError,
}));

vi.mock("../src/server/vector/qa-milvus-foundation", () => ({
  qaMilvusFoundationService: {
    prepare: prepareMock,
  },
}));

import { healthPayloadSchema } from "../src/lib/schemas/health";
import { getLlmProviderHealth } from "../src/server/health/llm-provider";
import { getHealthSnapshot } from "../src/server/health/service";
import { OpenClawResponsesClientError } from "../src/server/adapters/openclaw/llm-client";

function createVectorFoundationSnapshot() {
  return {
    enabled: true,
    status: "ok" as const,
    collectionName: "qa_chunks",
    dimension: 1536,
    questionChunkCount: 12,
    answerChunkCount: 12,
    sourceExcerptChunkCount: 6,
    pendingEmbeddingCount: 0,
    readyEmbeddingCount: 30,
    failedEmbeddingCount: 0,
    pendingSyncCount: 0,
    syncedDocumentCount: 18,
    failedSyncCount: 0,
    pendingDeleteJobCount: 0,
    latestJob: null,
    warnings: [],
  };
}

describe("llm provider health", () => {
  beforeEach(() => {
    createJsonObjectMock.mockReset();
    prepareMock.mockReset();
    prepareMock.mockResolvedValue(createVectorFoundationSnapshot());
  });

  it("reports connected status when the probe succeeds", async () => {
    createJsonObjectMock.mockResolvedValue({
      ok: true,
    });

    const result = await getLlmProviderHealth();

    expect(result).toEqual({
      configured: true,
      status: "connected",
      message: "模型服务已连接",
    });
    expect(createJsonObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "qa",
        input: "health_probe",
        maxOutputTokens: 16,
        timeoutMs: 2000,
      }),
    );
  });

  it("reports response_error when the provider returns an unexpected JSON shape", async () => {
    createJsonObjectMock.mockResolvedValue({
      ok: false,
    });

    const result = await getLlmProviderHealth();

    expect(result).toEqual({
      configured: true,
      status: "response_error",
      message: "模型服务响应异常",
    });
  });

  it("reports not_configured when provider config is missing", async () => {
    createJsonObjectMock.mockRejectedValue(
      new OpenClawResponsesClientError(
        "provider_config_error",
        "provider_config_error: Missing config.",
      ),
    );

    const result = await getLlmProviderHealth();

    expect(result).toEqual({
      configured: false,
      status: "not_configured",
      message: "模型服务未配置",
    });
  });

  it("embeds llm provider status into the health payload", async () => {
    createJsonObjectMock.mockRejectedValue(
      new OpenClawResponsesClientError(
        "provider_timeout",
        "provider_timeout: Timed out.",
      ),
    );

    const snapshot = await getHealthSnapshot();

    expect(prepareMock).toHaveBeenCalledWith({
      runSync: false,
      refreshCorpus: false,
    });
    expect(snapshot.llm_provider).toEqual({
      configured: true,
      status: "timeout",
      message: "模型服务连接超时",
    });
    expect(healthPayloadSchema.parse(snapshot)).toEqual(snapshot);
  });
});
