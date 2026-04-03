/**
 * [POS] 提供 LLM provider 的轻量运行态探测，供 workbench 顶栏与 health API 共享真实状态。
 * [IN] 无显式入参；复用 OpenClaw LLM client 的 provider 解析与最小 JSON 请求能力。
 * [OUT] 返回已连接 / 未配置 / 超时 / 连接失败 / 响应异常的简洁状态，不抛出 provider 探测异常给上层 UI。
 *
 * @feature open-interview-server-core-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

import { z } from "zod";

import type { LlmProviderHealth } from "@/lib/schemas/health";
import {
  OpenClawResponsesClientError,
  openClawLlmClient,
} from "@/server/adapters/openclaw/llm-client";

const llmProviderProbeResultSchema = z.object({
  ok: z.literal(true),
});

const llmProviderProbeTimeoutMs = 2_000;

function buildLlmProviderHealth(
  status: LlmProviderHealth["status"],
  configured: boolean,
  message: string,
): LlmProviderHealth {
  return {
    configured,
    status,
    message,
  };
}

function mapProbeErrorToHealth(error: unknown): LlmProviderHealth {
  if (error instanceof z.ZodError) {
    return buildLlmProviderHealth("response_error", true, "模型服务响应异常");
  }

  if (!(error instanceof OpenClawResponsesClientError)) {
    return buildLlmProviderHealth("connection_error", true, "模型服务连接失败");
  }

  switch (error.code) {
    case "provider_config_error":
      return buildLlmProviderHealth("not_configured", false, "模型服务未配置");
    case "provider_timeout":
      return buildLlmProviderHealth("timeout", true, "模型服务连接超时");
    case "provider_transport_error":
    case "provider_http_error":
      return buildLlmProviderHealth("connection_error", true, "模型服务连接失败");
    case "provider_response_error":
    case "provider_response_shape_error":
    case "invalid_json":
      return buildLlmProviderHealth("response_error", true, "模型服务响应异常");
    default:
      return buildLlmProviderHealth("connection_error", true, "模型服务连接失败");
  }
}

export async function getLlmProviderHealth(): Promise<LlmProviderHealth> {
  try {
    const probeResult = llmProviderProbeResultSchema.parse(
      await openClawLlmClient.createJsonObject({
        task: "qa",
        instructions:
          'Return JSON only. Respond with exactly {"ok":true} and no additional keys.',
        input: "health_probe",
        maxOutputTokens: 16,
        timeoutMs: llmProviderProbeTimeoutMs,
      }),
    );

    if (probeResult.ok) {
      return buildLlmProviderHealth("connected", true, "模型服务已连接");
    }

    return buildLlmProviderHealth("response_error", true, "模型服务响应异常");
  } catch (error) {
    return mapProbeErrorToHealth(error);
  }
}
