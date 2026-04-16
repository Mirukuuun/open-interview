// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const QA_DIR = join(process.cwd(), "src/features/qa");

function readAllQaSources(): string {
  const files = readdirSync(QA_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  return files.map((f) => readFileSync(join(QA_DIR, f), "utf-8")).join("\n");
}

describe("/qa page (M2/T2.2)", () => {
  it("no interactive-card class", () => {
    const source = readAllQaSources();
    expect(source).not.toMatch(/interactive-card/);
  });

  it("no reveal-list class", () => {
    const source = readAllQaSources();
    expect(source).not.toMatch(/reveal-list/);
  });

  it("no eyebrow= prop", () => {
    const source = readAllQaSources();
    expect(source).not.toMatch(/eyebrow=/);
  });

  it("no inline radial-gradient", () => {
    const source = readAllQaSources();
    expect(source).not.toMatch(/radial-gradient/);
  });

  it("no deprecated token classnames (border-border-strong / text-text-muted / bg-accent)", () => {
    const source = readAllQaSources();
    expect(source).not.toMatch(/border-border-strong/);
    expect(source).not.toMatch(/text-text-muted/);
    expect(source).not.toMatch(/text-text-strong/);
    expect(source).not.toMatch(/border-border-muted/);
    expect(source).not.toMatch(/\bbg-accent\b/);
    expect(source).not.toMatch(/\btext-accent\b/);
  });
});
