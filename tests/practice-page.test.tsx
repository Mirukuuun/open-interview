// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PRACTICE_DIR = join(process.cwd(), "src/features/practice");

function readAllPracticeSources(): string {
  const files = readdirSync(PRACTICE_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  return files.map((f) => readFileSync(join(PRACTICE_DIR, f), "utf-8")).join("\n");
}

describe("/practice page (M2/T2.1)", () => {
  it("no radar-draw animation reference", () => {
    const source = readAllPracticeSources();
    expect(source).not.toMatch(/radar-draw/);
  });

  it("no reveal-list class", () => {
    const source = readAllPracticeSources();
    expect(source).not.toMatch(/reveal-list/);
  });

  it("no interactive-card class", () => {
    const source = readAllPracticeSources();
    expect(source).not.toMatch(/interactive-card/);
  });

  it("no deprecated token classnames (border-border-strong / text-text-muted / bg-accent)", () => {
    const source = readAllPracticeSources();
    expect(source).not.toMatch(/border-border-strong/);
    expect(source).not.toMatch(/text-text-muted/);
    expect(source).not.toMatch(/text-text-strong/);
    expect(source).not.toMatch(/border-border-muted/);
    expect(source).not.toMatch(/\bbg-accent\b/);
    expect(source).not.toMatch(/\btext-accent\b/);
  });
});
