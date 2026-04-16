// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const IMPORT_DIR = join(process.cwd(), "src/features/import");

function readAllImportSources(): string {
  const files = readdirSync(IMPORT_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  return files.map((f) => readFileSync(join(IMPORT_DIR, f), "utf-8")).join("\n");
}

describe("/import page (M2/T2.6)", () => {
  it("no reveal-list class", () => {
    const source = readAllImportSources();
    expect(source).not.toMatch(/reveal-list/);
  });

  it("no deprecated token classnames (border-border-strong / text-text-muted / bg-accent)", () => {
    const source = readAllImportSources();
    expect(source).not.toMatch(/border-border-strong/);
    expect(source).not.toMatch(/text-text-muted/);
    expect(source).not.toMatch(/text-text-strong/);
    expect(source).not.toMatch(/border-border-muted/);
    expect(source).not.toMatch(/\bbg-accent\b/);
    expect(source).not.toMatch(/\btext-accent\b/);
  });
});
