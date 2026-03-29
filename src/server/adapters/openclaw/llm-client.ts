import {
  readOpenClawConfiguredProviders,
  resolveOpenClawLlmProviderConfigs,
  type OpenClawResolvedLlmProviderConfig,
} from "@/server/adapters/openclaw/provider-config";

type OpenClawProviderConfig = OpenClawResolvedLlmProviderConfig;

type JsonObjectRequest = {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  task?: "parse_interview" | "qa";
};

async function resolveProviderConfigs(
  task: JsonObjectRequest["task"] = "parse_interview",
): Promise<OpenClawProviderConfig[]> {
  try {
    const configuredProviders = await readOpenClawConfiguredProviders();

    return resolveOpenClawLlmProviderConfigs({
      env: process.env,
      task,
      configuredProviders,
    });
  } catch (error) {
    throw new OpenClawResponsesClientError(
      "provider_config_error",
      `provider_config_error: ${error instanceof Error ? error.message : "Invalid LLM provider config."}`,
    );
  }
}

function extractResponsesApiText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as {
    output_text?: unknown;
    output?: Array<{
      type?: unknown;
      content?: Array<{
        type?: unknown;
        text?: unknown;
      }>;
    }>;
  };

  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  if (!Array.isArray(response.output)) {
    return null;
  }

  const textParts = response.output.flatMap((item) => {
    if (!Array.isArray(item?.content)) {
      return [];
    }

    return item.content
      .map((contentPart) =>
        typeof contentPart?.text === "string" ? contentPart.text.trim() : "",
      )
      .filter((contentPart) => contentPart.length > 0);
  });

  return textParts.length > 0 ? textParts.join("\n").trim() : null;
}

function extractChatCompletionsText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };

  const firstChoice = response.choices?.[0];
  const content = firstChoice?.message?.content;

  if (typeof content === "string" && content.trim().length > 0) {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const textParts = content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }

      const textValue = (part as { text?: unknown }).text;

      return typeof textValue === "string" ? textValue.trim() : "";
    })
    .filter((part) => part.length > 0);

  return textParts.length > 0 ? textParts.join("\n").trim() : null;
}

function normalizeJsonCandidate(text: string) {
  const trimmedText = text.trim();
  const fencedMatch = trimmedText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/u);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBraceIndex = trimmedText.indexOf("{");
  const lastBraceIndex = trimmedText.lastIndexOf("}");

  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    return trimmedText.slice(firstBraceIndex, lastBraceIndex + 1).trim();
  }

  return trimmedText;
}

export class OpenClawResponsesClientError extends Error {
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
    code: OpenClawResponsesClientError["code"],
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

async function createJsonObjectWithProvider(
  config: OpenClawProviderConfig,
  request: JsonObjectRequest,
) {
  const controller = AbortSignal.timeout(config.timeoutMs);
  let response: Response;
  const endpointPath = config.api === "openai-completions" ? "/chat/completions" : "/responses";
  const requestBody =
    config.api === "openai-completions"
      ? {
          model: config.model,
          messages: [
            {
              role: "system",
              content: request.instructions,
            },
            {
              role: "user",
              content: request.input,
            },
          ],
          response_format: {
            type: "json_object",
          },
          temperature: 0,
          max_tokens: request.maxOutputTokens ?? 2_000,
        }
      : {
          model: config.model,
          input: [
            {
              role: "developer",
              content: request.instructions,
            },
            {
              role: "user",
              content: request.input,
            },
          ],
          text: {
            format: {
              type: "json_object",
            },
            verbosity: "low",
          },
          max_output_tokens: request.maxOutputTokens ?? 2_000,
        };

  try {
    response = await fetch(`${config.baseUrl}${endpointPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
      signal: controller,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transport error.";
    const causeCode =
      error && typeof error === "object" && "cause" in error
        ? ((error as { cause?: { code?: unknown } }).cause?.code ?? null)
        : null;

    if (
      (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) ||
      causeCode === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      throw new OpenClawResponsesClientError(
        "provider_timeout",
        `provider_timeout: Timed out while calling ${config.baseUrl}${endpointPath}.`,
      );
    }

    throw new OpenClawResponsesClientError(
      "provider_transport_error",
      `provider_transport_error: Failed to call ${config.baseUrl}${endpointPath} (${message}).`,
      undefined,
      {
        causeCode,
      },
    );
  }

  const responseText = await response.text();

  if (!response.ok) {
    throw new OpenClawResponsesClientError(
      "provider_http_error",
      `provider_http_error: Provider returned HTTP ${response.status} (${response.statusText || "unknown status"}).`,
      response.status,
      {
        bodyPreview: responseText.slice(0, 500),
      },
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    throw new OpenClawResponsesClientError(
      "provider_response_shape_error",
      `provider_response_shape_error: Provider returned non-JSON HTTP body from ${endpointPath}.`,
      response.status,
      {
        bodyPreview: responseText.slice(0, 500),
        cause: error instanceof Error ? error.message : null,
      },
    );
  }

  const providerError =
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
      ? payload.error.message
      : null;

  if (providerError) {
    throw new OpenClawResponsesClientError(
      "provider_response_error",
      `provider_response_error: ${providerError}`,
      response.status,
    );
  }

  const outputText =
    config.api === "openai-completions"
      ? extractChatCompletionsText(payload)
      : extractResponsesApiText(payload);

  if (!outputText) {
    throw new OpenClawResponsesClientError(
      "provider_response_shape_error",
      "provider_response_shape_error: Provider response did not include output_text content.",
      response.status,
    );
  }

  try {
    return JSON.parse(normalizeJsonCandidate(outputText)) as Record<string, unknown>;
  } catch (error) {
    throw new OpenClawResponsesClientError(
      "invalid_json",
      "invalid_json: Model output was not valid JSON.",
      response.status,
      {
        outputPreview: outputText.slice(0, 500),
        cause: error instanceof Error ? error.message : null,
      },
    );
  }
}

export const openClawLlmClient = {
  async createJsonObject(request: JsonObjectRequest) {
    const configs = await resolveProviderConfigs(request.task);
    const errors: Array<{ provider: string; error: string }> = [];
    let lastError: unknown = null;

    for (const config of configs) {
      try {
        return await createJsonObjectWithProvider(config, request);
      } catch (error) {
        lastError = error;
        errors.push({
          provider: config.name,
          error: error instanceof Error ? error.message : "Unknown LLM provider error.",
        });
      }
    }

    if (lastError instanceof OpenClawResponsesClientError) {
      lastError.details = {
        ...(lastError.details && typeof lastError.details === "object" ? lastError.details : {}),
        attemptedProviders: errors,
      };
      throw lastError;
    }

    throw new OpenClawResponsesClientError(
      "provider_transport_error",
      "provider_transport_error: Every configured LLM provider failed.",
      undefined,
      {
        attemptedProviders: errors,
      },
    );
  },
};
