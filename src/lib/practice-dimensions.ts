import { z } from "zod";

export const practiceDimensionKeys = [
  "java_fundamentals",
  "database_storage",
  "distributed_systems",
  "computer_fundamentals",
  "system_design_engineering",
  "agent_capability",
] as const;

export const practiceDimensionKeySchema = z.enum(practiceDimensionKeys);

export type PracticeDimensionKey = z.infer<typeof practiceDimensionKeySchema>;

export const practiceDimensionCatalogVersion = "practice-v2";

export const practiceDimensionCatalog = [
  {
    key: "java_fundamentals",
    label: "Java基础",
  },
  {
    key: "database_storage",
    label: "数据库与存储",
  },
  {
    key: "distributed_systems",
    label: "分布式",
  },
  {
    key: "computer_fundamentals",
    label: "计算机基础",
  },
  {
    key: "system_design_engineering",
    label: "系统设计与工程实践",
  },
  {
    key: "agent_capability",
    label: "Agent能力",
  },
] as const satisfies ReadonlyArray<{
  key: PracticeDimensionKey;
  label: string;
}>;

const practiceDimensionLabelMap = new Map(
  practiceDimensionCatalog.map((dimension) => [dimension.key, dimension.label]),
);

export function getPracticeDimensionLabel(key: PracticeDimensionKey) {
  return practiceDimensionLabelMap.get(key) ?? key;
}
