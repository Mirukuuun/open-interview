// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const QUESTIONS_DIR = join(process.cwd(), "src/features/questions");

function readAllQuestionsSources(): string {
  const files = readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  return files.map((f) => readFileSync(join(QUESTIONS_DIR, f), "utf-8")).join("\n");
}

describe("/questions page (M2/T2.3)", () => {
  it("no deprecated token classnames (border-border-strong / text-text-muted / bg-accent)", () => {
    const source = readAllQuestionsSources();
    expect(source).not.toMatch(/border-border-strong/);
    expect(source).not.toMatch(/text-text-muted/);
    expect(source).not.toMatch(/text-text-strong/);
    expect(source).not.toMatch(/border-border-muted/);
    expect(source).not.toMatch(/\bbg-accent\b/);
    expect(source).not.toMatch(/\btext-accent\b/);
  });
});
