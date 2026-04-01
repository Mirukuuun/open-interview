import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";

import type { QaAnswerMode, QaCitation } from "@/lib/schemas/qa";
import { openClawLlmClient } from "@/server/adapters/openclaw/llm-client";
import {
  formatQaGroundedAnswerCitations,
  formatQaGroundedAnswerQuestionContexts,
  formatQaGroundedAnswerSessionHistory,
  qaGroundedAnswerInstructions,
  qaGroundedAnswerPrompt,
} from "@/server/prompts/qa-grounded-answer-prompt";

/**
 * [POS] 负责 QA assistant turn 的最终回答生成：优先融合 grounded 上下文，并在 grounding 弱或缺失时继续给出可用回答。
 * [IN] 用户 query、effective query、session history、本地 citations / question contexts 与 support level。
 * [OUT] 产出对用户可展示的 answer / supportSummary / answerMode；provider 不可用时降级到 deterministic fallback。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

const groundedAnswerResultSchema = z.object({
  answer: z.string().min(1),
});

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildSupportSummary(input: {
  supportLevel: QaAnswerMode;
  citationCount: number;
}) {
  if (input.supportLevel === "grounded_answered") {
    return `已结合本地题库中的 ${input.citationCount} 条引用生成回答。`;
  }

  if (input.supportLevel === "weak_support") {
    return input.citationCount > 0
      ? `已参考本地题库命中的 ${input.citationCount} 条引用，并结合通用表达补全回答。`
      : "本地只命中到较弱的相关线索，当前回答结合了少量本地线索和通用表达。";
  }

  return "本地题库暂未检索到直接依据，当前先给出一版通用回答思路；如果你补充相关题目、经历或材料，我可以继续改成更贴近你的版本。";
}

function pickBestContextSummary(context: {
  questionText: string;
  canonicalAnswer: string | null;
  personalAnswer: string | null;
  sourceSnippet: string | null;
}) {
  return compactWhitespace(
    context.personalAnswer ??
      context.canonicalAnswer ??
      context.sourceSnippet ??
      context.questionText,
  );
}

function buildGroundedOutline(
  questionContexts: Array<{
    questionText: string;
    canonicalAnswer: string | null;
    personalAnswer: string | null;
    sourceSnippet: string | null;
  }>,
) {
  const topSummaries = questionContexts
    .slice(0, 3)
    .map((context) => pickBestContextSummary(context))
    .filter(
      (summary, index, collection) =>
        summary.length > 0 && collection.indexOf(summary) === index,
    );

  if (topSummaries.length === 0) {
    return null;
  }

  return [
    "结合当前本地材料，可以先这样回答：",
    "",
    topSummaries.map((summary, index) => `${index + 1}. ${summary}`).join("\n"),
  ].join("\n");
}

function buildSelfIntroductionAnswer() {
  return [
    "可以先用 1 分钟版本来回答：",
    "",
    "“你好，我叫 X，目前主要从事 X 方向的工作，累计有 X 年相关经验。过去这段时间我重点做过 X、Y、Z 几类事情，其中我最能体现价值的一段经历是负责过 X 项目，主要承担了 X 职责，解决了 X 问题，并最终带来了 X 结果。我的优势比较集中在 X、Y 两点：一是能够快速把复杂问题拆清楚，二是能把方案真正推进落地。这次我想找的是更贴近 X 的机会，所以也很希望加入这个岗位。”",
    "",
    "如果你要说得更自然，记得把三块内容补成你自己的版本：当前方向、最强项目经历、这次跳槽动机。",
  ].join("\n");
}

function buildProjectAnswer() {
  return [
    "这类问题建议按“背景 - 目标 - 动作 - 结果”来讲：",
    "",
    "1. 先交代项目背景和业务目标，你为什么要做这件事。",
    "2. 再讲你个人负责的关键模块，不要只讲团队做了什么。",
    "3. 然后挑 1 到 2 个技术难点展开，说清方案权衡。",
    "4. 最后用结果收尾，例如性能提升、稳定性改善、交付效率提升。",
    "",
    "如果你愿意，我也可以继续帮你把某个项目压缩成 1 分钟或 3 分钟版本。",
  ].join("\n");
}

function buildStrengthWeaknessAnswer(query: string) {
  const isWeakness = /缺点|短板|不足/u.test(query);

  if (isWeakness) {
    return [
      "回答缺点时，重点不是“承认问题”，而是“证明你能管理问题”：",
      "",
      "1. 先说一个真实但不会伤到岗位核心要求的短板。",
      "2. 再说这个短板曾经带来的具体影响。",
      "3. 最后讲你已经怎么改，以及现在改善到了什么程度。",
      "",
      "一个稳妥表达是：“我过去在 X 上会比较弱，具体表现是 X。后来我通过 X 的方式持续补齐，现在已经能够做到 X，但我也还在继续优化。”",
    ].join("\n");
  }

  return [
    "回答优点时，不要只报关键词，最好做到“优点 + 证据 + 结果”：",
    "",
    "1. 先给一个和岗位强相关的能力判断。",
    "2. 再用一段真实经历证明这件事。",
    "3. 最后点出这个能力为什么适合当前岗位。",
    "",
    "例如：“我比较突出的一个优势是 X。之前在 X 场景里，我负责过 X，最终把 X 指标提升到了 X，所以我认为自己在这类问题上比较有优势。”",
  ].join("\n");
}

function buildMotivationAnswer(query: string) {
  if (/离职|换工作/u.test(query)) {
    return [
      "这类问题建议保持积极、客观、可验证：",
      "",
      "1. 先强调你当前换工作的核心诉求，例如业务空间、成长方向、岗位匹配度。",
      "2. 不要抱怨前公司或前团队。",
      "3. 最后把动机落到应聘岗位上，说明为什么这个机会更匹配你。",
      "",
      "一个常见说法是：“我这次变化主要还是希望往 X 方向继续深入。之前的经历让我在 X 上有了基础，但我希望在更复杂的业务里继续做深，所以才会重点看这类机会。”",
    ].join("\n");
  }

  return [
    "这类动机题建议回答成“为什么是你 + 为什么是现在 + 为什么是这个岗位”：",
    "",
    "1. 先讲你当前关注的方向。",
    "2. 再讲你已有经历为什么和这个岗位匹配。",
    "3. 最后点出这次机会最吸引你的地方。",
  ].join("\n");
}

function buildGenericAnswer(query: string) {
  const normalizedQuery = compactWhitespace(query);

  if (/自我介绍|介绍一下自己|介绍你自己|做个自我介绍/u.test(normalizedQuery)) {
    return buildSelfIntroductionAnswer();
  }

  if (/项目|项目经历|项目介绍/u.test(normalizedQuery)) {
    return buildProjectAnswer();
  }

  if (/优点|缺点|短板|不足/u.test(normalizedQuery)) {
    return buildStrengthWeaknessAnswer(normalizedQuery);
  }

  if (/离职|换工作|为什么想来|为什么选择|职业规划|未来规划/u.test(normalizedQuery)) {
    return buildMotivationAnswer(normalizedQuery);
  }

  return [
    `如果你要回答“${normalizedQuery}”，建议按这个顺序组织：`,
    "",
    "1. 先直接给结论，不要一上来铺背景。",
    "2. 再补 2 到 3 个最关键的判断依据或拆解点。",
    "3. 如果是面试场景，最好再补一个真实经历、取舍过程或结果数据。",
    "4. 最后用一句话收口，强调你的理解或落地经验。",
    "",
    "如果你愿意继续追问，我可以把这道题直接改成一版更像口语表达的面试答案。",
  ].join("\n");
}

function buildDeterministicFallback(input: {
  query: string;
  supportLevel: QaAnswerMode;
  citations: QaCitation[];
  questionContexts: Array<{
    questionText: string;
    canonicalAnswer: string | null;
    personalAnswer: string | null;
    sourceSnippet: string | null;
  }>;
}) {
  const groundedOutline = buildGroundedOutline(input.questionContexts);
  const generalAnswer = buildGenericAnswer(input.query);
  const answer =
    groundedOutline && input.supportLevel !== "no_grounded_support"
      ? [
          groundedOutline,
          input.supportLevel === "weak_support"
            ? "\n如果你要把这段讲得更完整，建议再补上你的真实经历、结果数据或关键取舍。"
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : generalAnswer;

  return {
    answer,
    supportSummary: buildSupportSummary({
      supportLevel: input.supportLevel,
      citationCount: input.citations.length,
    }),
    answerMode: input.supportLevel,
  } as const;
}

const groundedAnswerChain = RunnableSequence.from([
  qaGroundedAnswerPrompt,
  new RunnableLambda({
    func: async (promptValue: unknown) =>
      openClawLlmClient.createJsonObject({
        task: "qa",
        instructions: qaGroundedAnswerInstructions,
        input:
          typeof promptValue === "string"
            ? promptValue
            : promptValue && typeof promptValue === "object" && "toString" in promptValue
              ? promptValue.toString()
              : String(promptValue),
        maxOutputTokens: 1200,
      }),
  }),
  new RunnableLambda({
    func: async (payload: unknown) => groundedAnswerResultSchema.parse(payload),
  }),
]);

export async function answerGroundedQa(input: {
  query: string;
  effectiveQuery: string;
  supportLevel: QaAnswerMode;
  sessionHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  citations: QaCitation[];
  questionContexts: Array<{
    questionText: string;
    canonicalAnswer: string | null;
    personalAnswer: string | null;
    sourceSnippet: string | null;
  }>;
}): Promise<{
  answer: string;
  supportSummary: string;
  answerMode: QaAnswerMode;
}> {
  try {
    const result = await groundedAnswerChain.invoke({
      query: compactWhitespace(input.query),
      effectiveQuery: compactWhitespace(input.effectiveQuery),
      supportLevel: input.supportLevel,
      sessionHistory: formatQaGroundedAnswerSessionHistory(input.sessionHistory),
      questionContexts: formatQaGroundedAnswerQuestionContexts(
        input.questionContexts,
      ),
      citations: formatQaGroundedAnswerCitations(input.citations),
    });

    return {
      answer: result.answer,
      supportSummary: buildSupportSummary({
        supportLevel: input.supportLevel,
        citationCount: input.citations.length,
      }),
      answerMode: input.supportLevel,
    };
  } catch {
    return buildDeterministicFallback({
      query: input.query,
      supportLevel: input.supportLevel,
      citations: input.citations,
      questionContexts: input.questionContexts,
    });
  }
}
