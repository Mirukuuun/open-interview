import {
  getPracticeDimensionLabel,
  practiceDimensionCatalog,
  practiceDimensionKeySchema,
  type PracticeDimensionKey,
} from "@/lib/practice-dimensions";

/**
 * [POS] 维护考试模式固定维度 catalog 与 taxonomy -> dimension 的确定性映射配置。
 * [IN] 题目的 category、tags 等 taxonomy 信号。
 * [OUT] 返回归一化后的 dimension_weights 快照，供考试创建与历史复现使用。
 *
 * @feature open-interview-practice-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

export type PracticeDimensionWeight = {
  key: PracticeDimensionKey;
  weight: number;
};

const categorySignalMap: Record<string, PracticeDimensionWeight[]> = {
  java_concurrency: [{ key: "java_fundamentals", weight: 1 }],
  java_jvm: [{ key: "java_fundamentals", weight: 1 }],
  database: [{ key: "database_storage", weight: 1 }],
  distributed_system: [{ key: "distributed_systems", weight: 1 }],
  networking: [{ key: "computer_fundamentals", weight: 1 }],
  system_design: [{ key: "system_design_engineering", weight: 1 }],
  backend_framework: [{ key: "system_design_engineering", weight: 1 }],
  test: [{ key: "system_design_engineering", weight: 1 }],
};

const tagSignalMap: Record<string, PracticeDimensionWeight[]> = {
  java: [{ key: "java_fundamentals", weight: 1 }],
  java_concurrency: [{ key: "java_fundamentals", weight: 1 }],
  concurrency: [{ key: "java_fundamentals", weight: 1 }],
  threadlocal: [{ key: "java_fundamentals", weight: 1 }],
  jvm: [{ key: "java_fundamentals", weight: 1 }],
  mysql: [{ key: "database_storage", weight: 1 }],
  database: [{ key: "database_storage", weight: 1 }],
  redis: [{ key: "distributed_systems", weight: 1 }],
  mq: [{ key: "distributed_systems", weight: 1 }],
  kafka: [{ key: "distributed_systems", weight: 1 }],
  rabbitmq: [{ key: "distributed_systems", weight: 1 }],
  rocketmq: [{ key: "distributed_systems", weight: 1 }],
  lock: [{ key: "distributed_systems", weight: 1 }],
  distributed_system: [{ key: "distributed_systems", weight: 1 }],
  network: [{ key: "computer_fundamentals", weight: 1 }],
  networking: [{ key: "computer_fundamentals", weight: 1 }],
  design: [{ key: "system_design_engineering", weight: 1 }],
  system_design: [{ key: "system_design_engineering", weight: 1 }],
  backend_framework: [{ key: "system_design_engineering", weight: 1 }],
  spring: [{ key: "system_design_engineering", weight: 1 }],
  test: [{ key: "system_design_engineering", weight: 1 }],
};

const legacyPracticeDimensionAliasMap: Record<string, PracticeDimensionKey> = {
  distributed_system: "distributed_systems",
  database: "database_storage",
  java_concurrency: "java_fundamentals",
  concurrency: "java_fundamentals",
  backend_framework: "system_design_engineering",
  networking: "computer_fundamentals",
  network: "computer_fundamentals",
  redis: "distributed_systems",
  "分布式系统": "distributed_systems",
  "分布式": "distributed_systems",
  "数据库": "database_storage",
  "java_并发": "java_fundamentals",
  "并发": "java_fundamentals",
  "后端框架": "system_design_engineering",
  "网络协议": "computer_fundamentals",
};

function normalizeSignal(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function roundWeight(value: number) {
  return Number(value.toFixed(4));
}

function normalizeWeights(
  weights: Map<PracticeDimensionKey, number>,
): PracticeDimensionWeight[] {
  const totalWeight = Array.from(weights.values()).reduce(
    (sum, currentValue) => sum + currentValue,
    0,
  );

  if (totalWeight <= 0) {
    return [
      {
        key: "system_design_engineering" satisfies PracticeDimensionKey,
        weight: 1,
      },
    ];
  }

  const orderedWeights = practiceDimensionCatalog
    .map((dimension) => ({
      key: dimension.key,
      weight: weights.get(dimension.key) ?? 0,
    }))
    .filter((dimension) => dimension.weight > 0);

  let assignedWeight = 0;

  return orderedWeights.map((dimension, index): PracticeDimensionWeight => {
    if (index === orderedWeights.length - 1) {
      return {
        key: dimension.key,
        weight: roundWeight(Math.max(0, 1 - assignedWeight)),
      };
    }

    const normalizedWeight = roundWeight(dimension.weight / totalWeight);
    assignedWeight += normalizedWeight;

    return {
      key: dimension.key,
      weight: normalizedWeight,
    };
  });
}

function addSignalWeights(
  target: Map<PracticeDimensionKey, number>,
  weights: PracticeDimensionWeight[] | undefined,
) {
  if (!weights) {
    return;
  }

  weights.forEach((weight) => {
    target.set(weight.key, (target.get(weight.key) ?? 0) + weight.weight);
  });
}

function pickPrimaryDimension(
  weights: PracticeDimensionWeight[] | undefined,
): PracticeDimensionKey | null {
  if (!weights || weights.length === 0) {
    return null;
  }

  return [...weights].sort((left, right) => right.weight - left.weight)[0]?.key ?? null;
}

export function resolvePracticeDimensionKey(
  signal: string | null | undefined,
): PracticeDimensionKey | null {
  const normalizedSignal = normalizeSignal(signal);

  if (!normalizedSignal) {
    return null;
  }

  const directMatch = practiceDimensionKeySchema.safeParse(normalizedSignal);

  if (directMatch.success) {
    return directMatch.data;
  }

  return (
    legacyPracticeDimensionAliasMap[normalizedSignal] ??
    pickPrimaryDimension(categorySignalMap[normalizedSignal]) ??
    pickPrimaryDimension(tagSignalMap[normalizedSignal]) ??
    null
  );
}

export function resolvePracticeDimensionWeights(input: {
  category?: string | null;
  tags: string[];
}): PracticeDimensionWeight[] {
  const resolvedWeights = new Map<PracticeDimensionKey, number>();
  const normalizedCategory = normalizeSignal(input.category);
  const normalizedTags = Array.from(
    new Set(input.tags.map((tag) => normalizeSignal(tag)).filter(Boolean)),
  );

  addSignalWeights(resolvedWeights, categorySignalMap[normalizedCategory]);
  normalizedTags.forEach((tag) => addSignalWeights(resolvedWeights, tagSignalMap[tag]));

  return normalizeWeights(resolvedWeights);
}

export function listPracticeDimensions() {
  return practiceDimensionCatalog.map((dimension) => ({
    key: dimension.key,
    label: dimension.label,
  }));
}

export function getPracticeDimensionSummaryLabel(key: PracticeDimensionKey) {
  return getPracticeDimensionLabel(key);
}
