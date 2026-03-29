import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";

import { openClawLlmClient } from "@/server/adapters/openclaw/llm-client";

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

function formatSessionHistory(
  history: Array<{
    role: "user" | "assistant";
    content: string;
  }>,
) {
  if (history.length === 0) {
    return "No conversation history.";
  }

  return history
    .slice(-4)
    .map((turn) => `${turn.role.toUpperCase()}: ${compactWhitespace(turn.content)}`)
    .join("\n");
}

const rewritePrompt = PromptTemplate.fromTemplate(`
You rewrite follow-up QA queries into standalone retrieval queries for a local interview-prep knowledge base.

Return a JSON object with:
- rewrite_applied: boolean
- rewritten_query: string
- reason: short string

Rules:
- Keep the user's original intent and language.
- Use conversation history only to resolve omitted entities or pronouns.
- If the query is already standalone, keep it nearly unchanged.
- Never invent facts outside the provided history.

Conversation history:
{sessionHistory}

Current query:
{query}
`.trim());

const rewriteChain = RunnableSequence.from([
  rewritePrompt,
  new RunnableLambda({
    func: async (promptValue: unknown) =>
      openClawLlmClient.createJsonObject({
        task: "qa",
        instructions:
          "Rewrite the current user query into a standalone retrieval query. Respond with JSON only.",
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
      sessionHistory: formatSessionHistory(input.sessionHistory),
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
