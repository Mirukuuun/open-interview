import { PromptTemplate } from "@langchain/core/prompts";
import {
  getRequiredPromptSection,
  loadPromptMarkdown,
  renderPromptTemplate,
} from "@/server/prompts/markdown-prompt-loader";

/**
 * [POS] 维护 QA history-aware rewrite 链路的固定 prompt 模板与 provider instructions。
 * [IN] 最近会话历史与当前 query。
 * [OUT] 返回 rewrite prompt template 与 instructions；不负责是否触发 rewrite 的判定逻辑。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

type QaRewriteHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

const qaRewritePromptDocument = loadPromptMarkdown("qa-rewrite.md");
const qaRewriteHistoryLineTemplate = getRequiredPromptSection(
  qaRewritePromptDocument,
  "history_line",
);
const qaRewriteHistoryEmptyState = getRequiredPromptSection(
  qaRewritePromptDocument,
  "history_empty",
);

export const qaRewriteInstructions = getRequiredPromptSection(
  qaRewritePromptDocument,
  "instructions",
);

export const qaRewritePrompt = PromptTemplate.fromTemplate(
  getRequiredPromptSection(qaRewritePromptDocument, "template"),
);

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function mapQaHistoryRoleLabel(role: QaRewriteHistoryTurn["role"]) {
  return role === "user" ? "用户" : "助手";
}

export function formatQaRewriteSessionHistory(history: QaRewriteHistoryTurn[]) {
  if (history.length === 0) {
    return qaRewriteHistoryEmptyState;
  }

  return history
    .slice(-4)
    .map((turn) =>
      renderPromptTemplate(qaRewriteHistoryLineTemplate, {
        role: mapQaHistoryRoleLabel(turn.role),
        content: compactWhitespace(turn.content),
      }),
    )
    .join("\n");
}
