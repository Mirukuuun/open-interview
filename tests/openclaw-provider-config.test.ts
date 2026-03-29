import { describe, expect, it } from "vitest";

import {
  resolveOpenClawEmbeddingProviderConfig,
  resolveOpenClawLlmProviderConfigs,
  type OpenClawConfiguredProvider,
} from "../src/server/adapters/openclaw/provider-config";

const configuredProviders: OpenClawConfiguredProvider[] = [
  {
    name: "sub2api",
    baseUrl: "http://127.0.0.1:18080/v1",
    apiKey: "llm-key",
    api: "openai-responses",
    modelIds: ["gpt-5.4"],
  },
  {
    name: "dashscope-embedding",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: "embedding-key",
    api: "openai-responses",
    modelIds: ["text-embedding-v4"],
  },
];

function createEnv(
  overrides: Record<string, string | undefined>,
): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(overrides).filter((entry): entry is [string, string] =>
      typeof entry[1] === "string",
    ),
  ) as NodeJS.ProcessEnv;
}

describe("openclaw provider config", () => {
  it("keeps embedding config isolated from llm env vars", () => {
    const config = resolveOpenClawEmbeddingProviderConfig({
      env: createEnv({
        LLM_BASE_URL: "http://127.0.0.1:18080/v1",
        LLM_API_KEY: "llm-key",
        EMBEDDING_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        EMBEDDING_API_KEY: "embedding-key",
        EMBEDDING_MODEL: "text-embedding-v4",
        EMBEDDING_TIMEOUT_MS: "120000",
        MILVUS_VECTOR_DIM: "1024",
      }),
      configuredProviders,
    });

    expect(config.baseUrl).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
    expect(config.apiKey).toBe("embedding-key");
    expect(config.model).toBe("text-embedding-v4");
    expect(config.timeoutMs).toBe(120000);
    expect(config.dimensions).toBe(1024);
  });

  it("supports selecting an independent embedding provider by name", () => {
    const config = resolveOpenClawEmbeddingProviderConfig({
      env: createEnv({
        EMBEDDING_PROVIDER_NAME: "dashscope-embedding",
      }),
      configuredProviders,
    });

    expect(config.baseUrl).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
    expect(config.apiKey).toBe("embedding-key");
    expect(config.model).toBe("text-embedding-v4");
  });

  it("supports selecting a dedicated llm provider while keeping task model overrides", () => {
    const qaConfigs = resolveOpenClawLlmProviderConfigs({
      env: createEnv({
        LLM_PROVIDER_NAME: "sub2api",
        LLM_MODEL_QA: "gpt-5.4",
        LLM_MODEL_PARSE_INTERVIEW: "gpt-5.4-mini",
      }),
      task: "qa",
      configuredProviders,
    });
    const parseConfigs = resolveOpenClawLlmProviderConfigs({
      env: createEnv({
        LLM_PROVIDER_NAME: "sub2api",
        LLM_MODEL_QA: "gpt-5.4",
        LLM_MODEL_PARSE_INTERVIEW: "gpt-5.4-mini",
      }),
      task: "parse_interview",
      configuredProviders,
    });

    expect(qaConfigs).toHaveLength(1);
    expect(qaConfigs[0]?.name).toBe("sub2api");
    expect(qaConfigs[0]?.model).toBe("gpt-5.4");
    expect(parseConfigs[0]?.model).toBe("gpt-5.4-mini");
  });

  it("throws a clear error when the selected provider is missing", () => {
    expect(() =>
      resolveOpenClawEmbeddingProviderConfig({
        env: createEnv({
          EMBEDDING_PROVIDER_NAME: "missing-provider",
        }),
        configuredProviders,
      }),
    ).toThrow('Missing configured embedding provider "missing-provider"');
  });
});
