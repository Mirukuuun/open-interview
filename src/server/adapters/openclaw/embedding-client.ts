import {
  defaultOpenClawEmbeddingModel,
  readOpenClawConfiguredProviders,
  resolveOpenClawEmbeddingProviderConfig,
  trimNullable,
} from "@/server/adapters/openclaw/provider-config";

type OpenClawEmbeddingConfig = {
  baseUrl: string;
  apiKey: string | null;
  model: string;
  timeoutMs: number;
  dimensions: number | null;
};

export async function resolveOpenClawEmbeddingConfig(): Promise<OpenClawEmbeddingConfig> {
  try {
    const configuredProviders = await readOpenClawConfiguredProviders();

    return resolveOpenClawEmbeddingProviderConfig({
      env: process.env,
      configuredProviders,
    });
  } catch (error) {
    throw new OpenClawEmbeddingClientError(
      "provider_config_error",
      `Embedding provider config error: ${error instanceof Error ? error.message : "invalid config."}`,
    );
  }
}

function parseEmbeddingResponse(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new OpenClawEmbeddingClientError(
      "provider_response_error",
      "Embedding response payload was missing the data field.",
      undefined,
      payload,
    );
  }

  const data = (payload as { data?: unknown }).data;

  if (!Array.isArray(data)) {
    throw new OpenClawEmbeddingClientError(
      "provider_response_error",
      "Embedding response data was not an array.",
      undefined,
      payload,
    );
  }

  return data
    .map((row, index) => {
      if (!row || typeof row !== "object") {
        throw new OpenClawEmbeddingClientError(
          "provider_response_error",
          "Embedding item was not an object.",
          undefined,
          row,
        );
      }

      const embedding = (row as { embedding?: unknown }).embedding;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new OpenClawEmbeddingClientError(
          "provider_response_error",
          "Embedding item was missing a float vector.",
          undefined,
          row,
        );
      }

      const vector = embedding.map((value) => Number(value));

      if (vector.some((value) => !Number.isFinite(value))) {
        throw new OpenClawEmbeddingClientError(
          "provider_response_error",
          "Embedding item contained a non-numeric vector entry.",
          undefined,
          row,
        );
      }

      return {
        index: Number((row as { index?: unknown }).index ?? index),
        vector,
      };
    })
    .sort((left, right) => left.index - right.index)
    .map((item) => item.vector);
}

export class OpenClawEmbeddingClientError extends Error {
  code:
    | "provider_config_error"
    | "provider_transport_error"
    | "provider_timeout"
    | "provider_http_error"
    | "provider_response_error";
  statusCode?: number;
  details?: unknown;

  constructor(
    code: OpenClawEmbeddingClientError["code"],
    message: string,
    statusCode?: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "OpenClawEmbeddingClientError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const openClawEmbeddingClient = {
  async createEmbeddings(input: {
    texts: string[];
  }) {
    const texts = input.texts.map((text) => text.trim()).filter((text) => text.length > 0);

    if (texts.length === 0) {
      return {
        provider: "openclaw",
        model:
          trimNullable(process.env.EMBEDDING_MODEL) ??
          trimNullable(process.env.EMBEDDING_MODEL_QA) ??
          defaultOpenClawEmbeddingModel,
        vectors: [],
        dimensions: 0,
      };
    }

    const config = await resolveOpenClawEmbeddingConfig();
    const controller = AbortSignal.timeout(config.timeoutMs);
    let response: Response;

    try {
      response = await fetch(`${config.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          input: texts,
          encoding_format: "float",
          ...(config.dimensions ? { dimensions: config.dimensions } : {}),
        }),
        signal: controller,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new OpenClawEmbeddingClientError(
          "provider_timeout",
          error.message,
          undefined,
          error,
        );
      }

      throw new OpenClawEmbeddingClientError(
        "provider_transport_error",
        error instanceof Error ? error.message : "Embedding transport failed.",
        undefined,
        error,
      );
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      throw new OpenClawEmbeddingClientError(
        "provider_response_error",
        "Embedding provider returned a non-JSON response.",
        response.status,
        error,
      );
    }

    if (!response.ok) {
      throw new OpenClawEmbeddingClientError(
        "provider_http_error",
        `Embedding provider returned HTTP ${response.status}.`,
        response.status,
        payload,
      );
    }

    const vectors = parseEmbeddingResponse(payload);

    return {
      provider: "openclaw",
      model: config.model,
      vectors,
      dimensions: vectors[0]?.length ?? 0,
    };
  },
};
