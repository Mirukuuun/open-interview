import { describe, expect, it } from "vitest";

import {
  formatCategoryLabel,
  formatCategoryLabelOrFallback,
  formatTagLabel,
  formatTagLabels,
} from "@/lib/taxonomy-display";

describe("taxonomy-display", () => {
  it("formats known categories into Chinese labels", () => {
    expect(formatCategoryLabel("java_concurrency")).toBe("Java 并发");
    expect(formatCategoryLabel(" distributed_system ")).toBe("分布式系统");
  });

  it("formats known tags into Chinese labels and preserves unknown tags", () => {
    expect(formatTagLabel("concurrency")).toBe("并发");
    expect(formatTagLabel("redis")).toBe("Redis");
    expect(formatTagLabel("manual_tag_1774358571536")).toBe("manual_tag_1774358571536");
  });

  it("formats tag lists item by item", () => {
    expect(formatTagLabels(["java", "lock", "custom_tag"])).toEqual([
      "Java",
      "锁",
      "custom_tag",
    ]);
  });

  it("provides a fallback label for empty categories", () => {
    expect(formatCategoryLabelOrFallback(undefined)).toBe("未分类");
    expect(formatCategoryLabelOrFallback("")).toBe("未分类");
  });
});
