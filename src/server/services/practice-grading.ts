import { z } from "zod";

import { practiceDimensionCatalog } from "@/lib/practice-dimensions";
import { openClawLlmClient } from "@/server/adapters/openclaw/llm-client";
import {
  buildPracticeGradingPromptInput,
  practiceGradingInstructions,
} from "@/server/prompts/practice-grading-prompt";
import type { PracticeDimensionWeight } from "@/server/services/practice-dimension-config";

/**
 * [POS] 负责 practice assessment 的批量评分：优先调用 LLM rubric 生成逐题分数与整体反馈，并在 provider 异常时降级到 deterministic fallback。
 * [IN] assessment item 快照、标准答案、用户回答、标签与维度权重。
 * [OUT] 产出单题评分、总分与考试摘要；结果保持可写回 assessment session / profile。
 *
 * @feature open-interview-practice-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

type AssessmentItemForScoring = {
  id: string;
  sequenceNo: number;
  questionTextSnapshot: string;
  canonicalAnswerSnapshot: string | null;
  categorySnapshot: string | null;
  tags: string[];
  dimensionWeights: PracticeDimensionWeight[];
  userAnswer: string | null;
  maxScore: number;
};

type ScoredAssessmentItem = {
  assessmentItemId: string;
  score: number;
  maxScore: number;
  feedback: {
    strengths: string[];
    missed_points: string[];
    improvement_advice: string;
  };
  skillScores: {
    accuracy: number;
    coverage: number;
    clarity: number;
  };
};

type ExamSummary = {
  overall_feedback: string;
  weak_areas: Array<{
    key: (typeof practiceDimensionCatalog)[number]["key"];
    label: string;
    question_count: number;
    coverage_weight: number;
    average_score: number;
  }>;
  exam_radar_dimensions: Array<{
    key: (typeof practiceDimensionCatalog)[number]["key"];
    label: string;
    question_count: number;
    coverage_weight: number;
    average_score: number;
  }>;
};

const llmAssessmentResultSchema = z.object({
  overall_feedback: z.string().min(1),
  items: z
    .array(
      z.object({
        sequence_no: z.number().int().min(1).max(10),
        score: z.number().int().min(0).max(10),
        coverage_score: z.number().int().min(0).max(10),
        accuracy_score: z.number().int().min(0).max(10),
        clarity_score: z.number().int().min(0).max(10),
        strengths: z.array(z.string().min(1)).min(1).max(3),
        missed_points: z.array(z.string().min(1)).min(1).max(4),
        improvement_advice: z.string().min(1),
      }),
    )
    .min(1)
    .max(10),
});

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

function roundScore(value: number) {
  return Number(value.toFixed(1));
}

function compactWhitespace(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function extractSignals(text: string) {
  const normalizedText = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u4e00-\u9fff]+/gu, " ")
    .trim();
  const wordTokens = normalizedText
    .split(/\s+/u)
    .filter((token) => token.length >= 2);
  const chineseChars = normalizedText.replace(/[^\u4e00-\u9fff]/gu, "");
  const chineseBigrams: string[] = [];

  for (let index = 0; index < chineseChars.length - 1; index += 1) {
    chineseBigrams.push(chineseChars.slice(index, index + 2));
  }

  return Array.from(new Set([...wordTokens, ...chineseBigrams])).slice(0, 40);
}

function buildExamSummary(
  items: AssessmentItemForScoring[],
  scoredItems: ScoredAssessmentItem[],
  overallFeedback: string,
): ExamSummary {
  const dimensionMap = new Map<
    (typeof practiceDimensionCatalog)[number]["key"],
    {
      label: string;
      weightedScore: number;
      coverageWeight: number;
      questionIds: Set<string>;
    }
  >();

  items.forEach((item, index) => {
    const scoredItem = scoredItems[index];

    item.dimensionWeights.forEach((dimensionWeight) => {
      const currentDimension = dimensionMap.get(dimensionWeight.key) ?? {
        label:
          practiceDimensionCatalog.find(
            (dimension) => dimension.key === dimensionWeight.key,
          )?.label ?? dimensionWeight.key,
        weightedScore: 0,
        coverageWeight: 0,
        questionIds: new Set<string>(),
      };

      currentDimension.weightedScore += scoredItem.score * dimensionWeight.weight;
      currentDimension.coverageWeight += dimensionWeight.weight;
      currentDimension.questionIds.add(item.id);
      dimensionMap.set(dimensionWeight.key, currentDimension);
    });
  });

  const examDimensions = practiceDimensionCatalog
    .map((dimension) => {
      const stat = dimensionMap.get(dimension.key);

      if (!stat || stat.coverageWeight <= 0) {
        return null;
      }

      return {
        key: dimension.key,
        label: dimension.label,
        question_count: stat.questionIds.size,
        coverage_weight: roundMetric(stat.coverageWeight),
        average_score: roundScore(stat.weightedScore / stat.coverageWeight),
      };
    })
    .filter((dimension) => dimension !== null);
  const weakAreas = [...examDimensions]
    .sort(
      (left, right) =>
        left.average_score - right.average_score ||
        right.coverage_weight - left.coverage_weight ||
        left.label.localeCompare(right.label, "zh-CN"),
    )
    .slice(0, 5);

  return {
    overall_feedback: overallFeedback,
    weak_areas: weakAreas,
    exam_radar_dimensions: examDimensions,
  };
}

function buildFallbackItem(item: AssessmentItemForScoring): ScoredAssessmentItem {
  const canonicalAnswer = compactWhitespace(item.canonicalAnswerSnapshot);
  const userAnswer = compactWhitespace(item.userAnswer);

  if (!userAnswer) {
    return {
      assessmentItemId: item.id,
      score: 0,
      maxScore: item.maxScore,
      feedback: {
        strengths: ["尚未作答，无法评估具体表达亮点。"],
        missed_points: [
          "缺少结论和要点展开。",
          "没有覆盖题目的核心知识点。",
        ],
        improvement_advice:
          "先用 2 到 4 句话给出结论，再补关键原理、风险点和落地案例。",
      },
      skillScores: {
        accuracy: 0,
        coverage: 0,
        clarity: 0,
      },
    };
  }

  const expectedSignals = extractSignals(canonicalAnswer);
  const answerSignals = extractSignals(userAnswer);
  const sharedSignals = expectedSignals.filter((signal) =>
    answerSignals.includes(signal),
  );
  const overlapRatio =
    expectedSignals.length === 0 ? 0.5 : sharedSignals.length / expectedSignals.length;
  const answerLengthRatio = canonicalAnswer
    ? Math.min(userAnswer.length / Math.max(canonicalAnswer.length, 1), 1)
    : Math.min(userAnswer.length / 120, 1);
  const accuracy = clampScore(overlapRatio * 10);
  const coverage = clampScore(overlapRatio * 6 + answerLengthRatio * 4);
  const clarity = clampScore(
    userAnswer.length >= 120 ? 8 : userAnswer.length >= 60 ? 6 : 4,
  );
  const score = clampScore(accuracy * 0.5 + coverage * 0.35 + clarity * 0.15);
  const missingSignals = expectedSignals
    .filter((signal) => !answerSignals.includes(signal))
    .slice(0, 3);

  return {
    assessmentItemId: item.id,
    score,
    maxScore: item.maxScore,
    feedback: {
      strengths: [
        sharedSignals.length > 0
          ? `已经覆盖到 ${sharedSignals.slice(0, 2).join("、")} 等关键点。`
          : "已经尝试给出自己的理解，具备继续完善的基础。",
      ],
      missed_points:
        missingSignals.length > 0
          ? missingSignals.map((signal) => `可以补充 ${signal} 相关的说明或风险点。`)
          : ["可以继续补充更具体的场景、取舍和结果。"],
      improvement_advice:
        "下一次先说结论，再按“原理/风险/方案/落地”四步展开，并补一个真实案例。",
    },
    skillScores: {
      accuracy,
      coverage,
      clarity,
    },
  };
}

function buildFallbackResult(items: AssessmentItemForScoring[]) {
  const scoredItems = items.map(buildFallbackItem);
  const averageScore =
    scoredItems.reduce((total, item) => total + item.score, 0) /
    Math.max(scoredItems.length, 1);
  const summary = buildExamSummary(
    items,
    scoredItems,
    averageScore >= 7
      ? "这一轮回答已经具备基本面试可用性，主要问题在于覆盖面和例证还不够稳定。"
      : "这一轮暴露出较明显的知识点覆盖不足，建议先围绕薄弱维度补标准答题框架，再继续做整套练习。",
  );

  return {
    items: scoredItems,
    totalScore: scoredItems.reduce((total, item) => total + item.score, 0),
    summary,
  };
}

function buildValidatedLlmResult(
  items: AssessmentItemForScoring[],
  payload: unknown,
) {
  const parsedPayload = llmAssessmentResultSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return null;
  }

  const mappedBySequence = new Map(
    parsedPayload.data.items.map((item) => [item.sequence_no, item]),
  );

  if (
    mappedBySequence.size !== items.length ||
    items.some((item) => !mappedBySequence.has(item.sequenceNo))
  ) {
    return null;
  }

  const scoredItems = items.map((item) => {
    const scoredItem = mappedBySequence.get(item.sequenceNo);

    if (!scoredItem) {
      throw new Error("Scored item was unexpectedly missing.");
    }

    return {
      assessmentItemId: item.id,
      score: scoredItem.score,
      maxScore: item.maxScore,
      feedback: {
        strengths: scoredItem.strengths,
        missed_points: scoredItem.missed_points,
        improvement_advice: scoredItem.improvement_advice,
      },
      skillScores: {
        accuracy: scoredItem.accuracy_score,
        coverage: scoredItem.coverage_score,
        clarity: scoredItem.clarity_score,
      },
    };
  });
  const totalScore = scoredItems.reduce((total, item) => total + item.score, 0);
  const summary = buildExamSummary(
    items,
    scoredItems,
    parsedPayload.data.overall_feedback,
  );

  return {
    items: scoredItems,
    totalScore,
    summary,
  };
}

export async function gradeAssessmentBatch(items: AssessmentItemForScoring[]) {
  try {
    const payload = await openClawLlmClient.createJsonObject({
      task: "qa",
      maxOutputTokens: 3_000,
      instructions: practiceGradingInstructions,
      input: buildPracticeGradingPromptInput(items),
    });
    const result = buildValidatedLlmResult(items, payload);

    if (result) {
      return result;
    }
  } catch {
    // Provider unavailable or invalid JSON falls through to deterministic fallback.
  }

  return buildFallbackResult(items);
}
