import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));

describe("font dependencies (M1/T1.2)", () => {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
    dependencies: Record<string, string>;
  };

  it("removes IBM Plex Sans", () => {
    expect(pkg.dependencies).not.toHaveProperty("@fontsource/ibm-plex-sans");
  });

  it("removes IBM Plex Mono", () => {
    expect(pkg.dependencies).not.toHaveProperty("@fontsource/ibm-plex-mono");
  });

  it("adds Inter", () => {
    expect(pkg.dependencies).toHaveProperty("@fontsource/inter");
  });

  it("keeps JetBrains Mono", () => {
    expect(pkg.dependencies).toHaveProperty("@fontsource/jetbrains-mono");
  });
});
