import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export type OpenClawProviderApi = "openai-responses" | "openai-completions";
export type OpenClawTask = "parse_interview" | "qa";

export type OpenClawConfiguredProvider = {
  name: string;
  baseUrl: string;
  apiKey: string | null;
  api: OpenClawProviderApi | null;
  modelIds: string[];
};

export type OpenClawResolvedLlmProviderConfig = {
  name: string;
  baseUrl: string;
  apiKey: string | null;
  api: OpenClawProviderApi;
  model: string;
  timeoutMs: number;
};

export type OpenClawResolvedEmbeddingConfig = {
  baseUrl: string;
  apiKey: string | null;
  model: string;
  timeoutMs: number;
  dimensions: number | null;
};

type OpenClawConfigFile = {
  models?: {
    providers?: Record<
      string,
      {
        baseUrl?: string | null;
        apiKey?: string | null;
        api?: string | null;
        models?: Array<{
          id?: string | null;
        }>;
      }
    >;
  };
};

export const defaultOpenClawBaseUrl = "http://127.0.0.1:18080/v1";
export const defaultOpenClawTimeoutMs = 60_000;
export const defaultOpenClawLlmModel = "gpt-5.4";
export const defaultOpenClawEmbeddingModel = "text-embedding-3-small";

const openClawConfigPath = path.join(homedir(), ".openclaw", "openclaw.json");

export function trimNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function parsePositiveInteger(value: string | undefined) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return Math.floor(parsedValue);
}

export function parseTimeoutMs(value: string | undefined) {
  return parsePositiveInteger(value);
}

export function parseProviderApi(
  value: string | null | undefined,
): OpenClawProviderApi | null {
  return value === "openai-completions" || value === "openai-responses" ? value : null;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/u, "");
}

function findConfiguredProvider(
  providers: OpenClawConfiguredProvider[],
  providerName: string | null,
) {
  if (!providerName) {
    return null;
  }

  const normalizedProviderName = providerName.toLowerCase();

  return (
    providers.find((provider) => provider.name.toLowerCase() === normalizedProviderName) ?? null
  );
}

function resolveLlmTaskModelId(
  env: NodeJS.ProcessEnv,
  task: OpenClawTask = "parse_interview",
) {
  if (task === "qa") {
    return trimNullable(env.LLM_MODEL_QA) ?? trimNullable(env.LLM_MODEL);
  }

  return trimNullable(env.LLM_MODEL_PARSE_INTERVIEW) ?? trimNullable(env.LLM_MODEL);
}

function resolveEmbeddingModelId(env: NodeJS.ProcessEnv) {
  return trimNullable(env.EMBEDDING_MODEL) ?? trimNullable(env.EMBEDDING_MODEL_QA);
}

export async function readOpenClawConfiguredProviders() {
  try {
    const configText = await readFile(openClawConfigPath, "utf8");
    const config = JSON.parse(configText) as OpenClawConfigFile;

    return Object.entries(config.models?.providers ?? {})
      .map(([name, provider]) => {
        const baseUrl = trimNullable(provider.baseUrl);

        if (!baseUrl) {
          return null;
        }

        return {
          name,
          baseUrl: normalizeBaseUrl(baseUrl),
          apiKey: trimNullable(provider.apiKey),
          api: parseProviderApi(trimNullable(provider.api)),
          modelIds: (provider.models ?? [])
            .map((model) => trimNullable(model.id))
            .filter((modelId): modelId is string => Boolean(modelId)),
        } satisfies OpenClawConfiguredProvider;
      })
      .filter(
        (
          provider,
        ): provider is OpenClawConfiguredProvider => provider !== null,
      );
  } catch {
    return [];
  }
}

export function resolveOpenClawLlmProviderConfigs(input: {
  env: NodeJS.ProcessEnv;
  task?: OpenClawTask;
  configuredProviders: OpenClawConfiguredProvider[];
}) {
  const selectedProviderName = trimNullable(input.env.LLM_PROVIDER_NAME);
  const selectedProvider = findConfiguredProvider(
    input.configuredProviders,
    selectedProviderName,
  );

  if (selectedProviderName && !selectedProvider) {
    throw new Error(
      `Missing configured LLM provider \"${selectedProviderName}\" in ~/.openclaw/openclaw.json.`,
    );
  }

  const timeoutMs =
    parseTimeoutMs(input.env.LLM_TIMEOUT_MS) ?? defaultOpenClawTimeoutMs;
  const explicitBaseUrl = trimNullable(input.env.LLM_BASE_URL);
  const explicitApiKey = trimNullable(input.env.LLM_API_KEY);
  const explicitApi = parseProviderApi(trimNullable(input.env.LLM_API));
  const explicitModel = resolveLlmTaskModelId(
    input.env,
    input.task ?? "parse_interview",
  );
  const fallbackProvider = selectedProvider ?? input.configuredProviders[0] ?? null;

  if (explicitBaseUrl || explicitApiKey || explicitApi || selectedProvider) {
    return [
      {
        name: selectedProvider?.name ?? "env",
        baseUrl: normalizeBaseUrl(
          explicitBaseUrl ?? fallbackProvider?.baseUrl ?? defaultOpenClawBaseUrl,
        ),
        apiKey: explicitApiKey ?? fallbackProvider?.apiKey ?? null,
        api: explicitApi ?? fallbackProvider?.api ?? "openai-responses",
        model:
          explicitModel ??
          fallbackProvider?.modelIds[0] ??
          defaultOpenClawLlmModel,
        timeoutMs,
      },
    ] satisfies OpenClawResolvedLlmProviderConfig[];
  }

  const candidates = input.configuredProviders
    .filter(
      (provider) => provider.api !== null && provider.modelIds.length > 0,
    )
    .map((provider) => ({
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      api: provider.api as OpenClawProviderApi,
      model: explicitModel ?? provider.modelIds[0] ?? defaultOpenClawLlmModel,
      timeoutMs,
    }));

  if (candidates.length === 0) {
    throw new Error(
      "Missing LLM provider config. Set LLM_BASE_URL / LLM_API_KEY, or configure a supported provider in ~/.openclaw/openclaw.json.",
    );
  }

  return candidates satisfies OpenClawResolvedLlmProviderConfig[];
}

export function resolveOpenClawEmbeddingProviderConfig(input: {
  env: NodeJS.ProcessEnv;
  configuredProviders: OpenClawConfiguredProvider[];
}) {
  const selectedProviderName = trimNullable(input.env.EMBEDDING_PROVIDER_NAME);
  const selectedProvider = findConfiguredProvider(
    input.configuredProviders,
    selectedProviderName,
  );

  if (selectedProviderName && !selectedProvider) {
    throw new Error(
      `Missing configured embedding provider \"${selectedProviderName}\" in ~/.openclaw/openclaw.json.`,
    );
  }

  return {
    baseUrl: normalizeBaseUrl(
      trimNullable(input.env.EMBEDDING_BASE_URL) ??
        selectedProvider?.baseUrl ??
        defaultOpenClawBaseUrl,
    ),
    apiKey:
      trimNullable(input.env.EMBEDDING_API_KEY) ??
      selectedProvider?.apiKey ??
      null,
    model:
      resolveEmbeddingModelId(input.env) ??
      selectedProvider?.modelIds[0] ??
      defaultOpenClawEmbeddingModel,
    timeoutMs:
      parseTimeoutMs(input.env.EMBEDDING_TIMEOUT_MS) ??
      defaultOpenClawTimeoutMs,
    dimensions:
      parsePositiveInteger(input.env.EMBEDDING_DIMENSIONS) ??
      parsePositiveInteger(input.env.MILVUS_VECTOR_DIM),
  } satisfies OpenClawResolvedEmbeddingConfig;
}
