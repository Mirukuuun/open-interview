import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";

import { openClawLlmClient } from "@/server/adapters/openclaw/llm-client";
import {
  formatQaRewriteSessionHistory,
  qaRewriteInstructions,
  qaRewritePrompt,
} from "@/server/prompts/qa-rewrite-prompt";

/**
 * [POS] 负责 QA 会话里的 history-aware query rewrite：在用户追问依赖上下文时，把问题改写成独立可检索查询。
 * [IN] 当前 query 与近期 session history。
 * [OUT] 产出 normalized / rewritten / effective query 及 rewrite reason；provider 不可用时保留原 query。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

const rewriteResultSchema = z.object({
  rewrite_applied: z.boolean(),
  rewritten_query: z.string().min(1),
  reason: z.string().min(1).optional(),
});

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeQaQuery(value: string) {
  return compactWhitespace(value);
}

function shouldRewriteQuery(query: string, historyLength: number) {
  const compactQuery = compactWhitespace(query).toLowerCase();

  if (historyLength === 0) {
    return false;
  }

  if (compactQuery.length <= 24) {
    return true;
  }

  return /\b(这个|那个|它|他|她|刚才|上面|继续|展开|补充|为什么|怎么做的)\b/u.test(
    compactQuery,
  );
}

const rewriteChain = RunnableSequence.from([
  qaRewritePrompt,
  new RunnableLambda({
    func: async (promptValue: unknown) =>
      openClawLlmClient.createJsonObject({
        task: "qa",
        instructions: qaRewriteInstructions,
        input:
          typeof promptValue === "string"
            ? promptValue
            : promptValue && typeof promptValue === "object" && "toString" in promptValue
              ? promptValue.toString()
              : String(promptValue),
        maxOutputTokens: 300,
      }),
  }),
  new RunnableLambda({
    func: async (payload: unknown) => rewriteResultSchema.parse(payload),
  }),
]);

export async function rewriteQaQuery(input: {
  query: string;
  sessionHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}) {
  const normalizedQuery = normalizeQaQuery(input.query);

  if (!shouldRewriteQuery(normalizedQuery, input.sessionHistory.length)) {
    return {
      normalizedQuery,
      rewriteApplied: false,
      rewrittenQuery: null,
      effectiveQuery: normalizedQuery,
      rewriteReason: "Query already looked standalone.",
    };
  }

  let result: z.infer<typeof rewriteResultSchema>;

  try {
    result = await rewriteChain.invoke({
      query: normalizedQuery,
      sessionHistory: formatQaRewriteSessionHistory(input.sessionHistory),
    });
  } catch {
    return {
      normalizedQuery,
      rewriteApplied: false,
      rewrittenQuery: null,
      effectiveQuery: normalizedQuery,
      rewriteReason: "Rewrite provider was unavailable, so the original query was kept.",
    };
  }

  const rewrittenQuery = compactWhitespace(result.rewritten_query);

  return {
    normalizedQuery,
    rewriteApplied: result.rewrite_applied && rewrittenQuery !== normalizedQuery,
    rewrittenQuery,
    effectiveQuery:
      result.rewrite_applied && rewrittenQuery.length > 0 ? rewrittenQuery : normalizedQuery,
    rewriteReason: result.reason ?? "History-aware rewrite applied.",
  };
}
