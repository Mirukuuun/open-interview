import { PromptTemplate } from "@langchain/core/prompts";

/**
 * [POS] 维护 QA history-aware rewrite 链路的固定 prompt 模板与 provider instructions。
 * [IN] 最近会话历史与当前 query。
 * [OUT] 返回 rewrite prompt template 与 instructions；不负责是否触发 rewrite 的判定逻辑。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

export const qaRewriteInstructions =
  "Rewrite the current user query into a standalone retrieval query. Respond with JSON only.";

export const qaRewritePrompt = PromptTemplate.fromTemplate(`
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
