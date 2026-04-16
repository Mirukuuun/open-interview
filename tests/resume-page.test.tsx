// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const RESUME_DIR = join(process.cwd(), "src/features/resume");

function readAllResumeSources(): string {
  const files = readdirSync(RESUME_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  return files.map((f) => readFileSync(join(RESUME_DIR, f), "utf-8")).join("\n");
}

describe("/resume page (M2/T2.7)", () => {
  it("no interactive-card class", () => {
    const source = readAllResumeSources();
    expect(source).not.toMatch(/interactive-card/);
  });

  it("no deprecated token classnames (border-border-strong / text-text-muted / bg-accent)", () => {
    const source = readAllResumeSources();
    expect(source).not.toMatch(/border-border-strong/);
    expect(source).not.toMatch(/text-text-muted/);
    expect(source).not.toMatch(/text-text-strong/);
    expect(source).not.toMatch(/border-border-muted/);
    expect(source).not.toMatch(/\bbg-accent\b/);
    expect(source).not.toMatch(/\btext-accent\b/);
  });
});
