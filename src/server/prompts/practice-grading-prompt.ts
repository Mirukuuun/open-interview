import {
  getRequiredPromptSection,
  loadPromptMarkdown,
  renderPromptTemplate,
} from "@/server/prompts/markdown-prompt-loader";

/**
 * [POS] 维护 practice exam AI 评分链路的固定 instructions 与输入拼装模板。
 * [IN] assessment item 的题面、标准答案、用户回答、分类与标签快照。
 * [OUT] 返回评分请求的 instructions 与 input 文本；不负责结果校验和 fallback。
 *
 * @feature open-interview-practice-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

export type PracticeGradingPromptItem = {
  sequenceNo: number;
  questionTextSnapshot: string;
  canonicalAnswerSnapshot: string | null;
  categorySnapshot: string | null;
  tags: string[];
  userAnswer: string | null;
};

function compactWhitespace(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

const practiceGradingPromptDocument = loadPromptMarkdown("practice-grading.md");
const practiceGradingItemTemplate = getRequiredPromptSection(
  practiceGradingPromptDocument,
  "item_template",
);
const practiceGradingItemSeparator = getRequiredPromptSection(
  practiceGradingPromptDocument,
  "separator",
);

export const practiceGradingInstructions = getRequiredPromptSection(
  practiceGradingPromptDocument,
  "instructions",
);

export function buildPracticeGradingPromptInput(items: PracticeGradingPromptItem[]) {
  return items
    .map((item) => {
      const canonicalAnswer = compactWhitespace(item.canonicalAnswerSnapshot);
      const userAnswer = compactWhitespace(item.userAnswer);
      const category = compactWhitespace(item.categorySnapshot);
      const tags = item.tags.join(", ");

      return renderPromptTemplate(practiceGradingItemTemplate, {
        sequenceNo: item.sequenceNo,
        questionTextSnapshot: compactWhitespace(item.questionTextSnapshot),
        canonical_answer: canonicalAnswer
          ? {
              canonicalAnswer,
            }
          : null,
        missing_canonical_answer: !canonicalAnswer,
        user_answer: userAnswer
          ? {
              userAnswer,
            }
          : null,
        missing_user_answer: !userAnswer,
        category: category
          ? {
              category,
            }
          : null,
        missing_category: !category,
        tags: tags
          ? {
              tags,
            }
          : null,
        missing_tags: !tags,
      });
    })
    .join(`\n\n${practiceGradingItemSeparator}\n\n`);
}
