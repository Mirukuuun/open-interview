import { PromptTemplate } from "@langchain/core/prompts";
import type { QaCitation } from "@/lib/schemas/qa";
import {
  getRequiredPromptSection,
  loadPromptMarkdown,
  renderPromptTemplate,
} from "@/server/prompts/markdown-prompt-loader";

/**
 * [POS] 维护 grounded QA answer 链路的固定 prompt 模板与 provider instructions。
 * [IN] support level、session history、effective query、grounded contexts 与 citations。
 * [OUT] 返回可直接供 grounded answer chain 使用的 prompt template 与 instructions。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

type QaGroundedHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

type QaGroundedQuestionContext = {
  questionText: string;
  canonicalAnswer: string | null;
  personalAnswer: string | null;
  sourceSnippet: string | null;
};

const qaGroundedAnswerPromptDocument = loadPromptMarkdown(
  "qa-grounded-answer.md",
);
const qaGroundedHistoryEmptyState = getRequiredPromptSection(
  qaGroundedAnswerPromptDocument,
  "history_empty",
);
const qaGroundedHistoryLineTemplate = getRequiredPromptSection(
  qaGroundedAnswerPromptDocument,
  "history_line",
);
const qaGroundedCitationsEmptyState = getRequiredPromptSection(
  qaGroundedAnswerPromptDocument,
  "citations_empty",
);
const qaGroundedCitationItemTemplate = getRequiredPromptSection(
  qaGroundedAnswerPromptDocument,
  "citation_item",
);
const qaGroundedQuestionContextsEmptyState = getRequiredPromptSection(
  qaGroundedAnswerPromptDocument,
  "question_contexts_empty",
);
const qaGroundedQuestionContextItemTemplate = getRequiredPromptSection(
  qaGroundedAnswerPromptDocument,
  "question_context_item",
);

export const qaGroundedAnswerInstructions = getRequiredPromptSection(
  qaGroundedAnswerPromptDocument,
  "instructions",
);

export const qaGroundedAnswerPrompt = PromptTemplate.fromTemplate(
  getRequiredPromptSection(qaGroundedAnswerPromptDocument, "template"),
);

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function mapQaHistoryRoleLabel(role: QaGroundedHistoryTurn["role"]) {
  return role === "user" ? "用户" : "助手";
}

export function formatQaGroundedAnswerSessionHistory(
  history: QaGroundedHistoryTurn[],
) {
  if (history.length === 0) {
    return qaGroundedHistoryEmptyState;
  }

  return history
    .slice(-4)
    .map((turn) =>
      renderPromptTemplate(qaGroundedHistoryLineTemplate, {
        role: mapQaHistoryRoleLabel(turn.role),
        content: compactWhitespace(turn.content),
      }),
    )
    .join("\n");
}

export function formatQaGroundedAnswerCitations(citations: QaCitation[]) {
  if (citations.length === 0) {
    return qaGroundedCitationsEmptyState;
  }

  return citations
    .slice(0, 4)
    .map((citation, index) =>
      renderPromptTemplate(qaGroundedCitationItemTemplate, {
        index: index + 1,
        label: citation.label,
        snippet_line: citation.snippet
          ? {
              snippet: compactWhitespace(citation.snippet),
            }
          : null,
        source_line: citation.source_document
          ? {
              sourceTitle: citation.source_document.title,
            }
          : null,
      }),
    )
    .join("\n\n");
}

export function formatQaGroundedAnswerQuestionContexts(
  questionContexts: QaGroundedQuestionContext[],
) {
  if (questionContexts.length === 0) {
    return qaGroundedQuestionContextsEmptyState;
  }

  return questionContexts
    .slice(0, 4)
    .map((context, index) =>
      renderPromptTemplate(qaGroundedQuestionContextItemTemplate, {
        index: index + 1,
        questionText: context.questionText,
        canonical_answer_line: context.canonicalAnswer
          ? {
              canonicalAnswer: compactWhitespace(context.canonicalAnswer),
            }
          : null,
        personal_answer_line: context.personalAnswer
          ? {
              personalAnswer: compactWhitespace(context.personalAnswer),
            }
          : null,
        source_snippet_line: context.sourceSnippet
          ? {
              sourceSnippet: compactWhitespace(context.sourceSnippet),
            }
          : null,
      }),
    )
    .join("\n\n");
}
