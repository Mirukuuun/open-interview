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

export const practiceGradingInstructions = [
  "你是资深中文技术面试官，要根据标准答案评估候选人的开放题回答。",
  "请严格输出 JSON 对象，不要输出 markdown。",
  "每题满分 10 分，分别给出 accuracy_score、coverage_score、clarity_score，均为 0-10 的整数。",
  "score 也是 0-10 的整数，综合考虑准确性、覆盖度和表达清晰度。",
  "strengths 只保留 1-3 条，missed_points 只保留 1-4 条，必须具体。",
  "overall_feedback 用中文总结本轮考试的整体表现、薄弱点和下一步复习建议。",
].join("\n");

export function buildPracticeGradingPromptInput(items: PracticeGradingPromptItem[]) {
  return items
    .map((item) =>
      [
        `题号: ${item.sequenceNo}`,
        `问题: ${compactWhitespace(item.questionTextSnapshot)}`,
        `标准答案: ${compactWhitespace(item.canonicalAnswerSnapshot) || "无"}`,
        `用户回答: ${compactWhitespace(item.userAnswer) || "未作答"}`,
        `分类: ${item.categorySnapshot ?? "未分类"}`,
        `标签: ${item.tags.join(", ") || "无"}`,
      ].join("\n"),
    )
    .join("\n\n---\n\n");
}
