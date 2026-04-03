import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

type BuildArtifactModule = {
  copyBuildArtifact: (input: {
    sourceDistDir: string;
    targetDistDir: string;
  }) => Promise<void>;
  isReusableBuildArtifact: (input: {
    metadata: Record<string, unknown> | null;
    commitSha: string;
  }) => boolean;
  readCurrentGitCommit: (rootDir: string) => Promise<string>;
  readBuildArtifactMetadata: (distDir: string) => Promise<Record<string, unknown> | null>;
  resolveBuildDistDir: (env?: Record<string, string | undefined>) => string;
  resolveBuildArtifactMetadataPath: (distDir: string) => string;
  writeBuildArtifactMetadata: (input: {
    distDir: string;
    commitSha: string;
    nodeVersion?: string;
  }) => Promise<Record<string, unknown>>;
};

let buildArtifactModule: BuildArtifactModule;

const tempDirs: string[] = [];

async function createTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "open-interview-build-"));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((tempDir) =>
      fs.rm(tempDir, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

beforeAll(async () => {
  const modulePath = "../scripts/build/build-artifact.mjs";

  buildArtifactModule = (await import(modulePath)) as BuildArtifactModule;
});

describe("build artifact helpers", () => {
  it("resolves the default and overridden dist dir", () => {
    expect(buildArtifactModule.resolveBuildDistDir({})).toBe(".next");
    expect(
      buildArtifactModule.resolveBuildDistDir({ NEXT_DIST_DIR: " .next-runtime.stage " }),
    ).toBe(".next-runtime.stage");
  });

  it("writes and reads reusable build metadata", async () => {
    const tempDir = await createTempDir();
    const distDir = path.join(tempDir, ".next");

    const metadata = await buildArtifactModule.writeBuildArtifactMetadata({
      distDir,
      commitSha: "abc123def456",
      nodeVersion: "v22.0.0",
    });
    const reloadedMetadata = await buildArtifactModule.readBuildArtifactMetadata(distDir);

    expect(metadata.commitSha).toBe("abc123def456");
    expect(buildArtifactModule.resolveBuildArtifactMetadataPath(distDir)).toBe(
      path.join(distDir, ".open-interview-build-meta.json"),
    );
    expect(reloadedMetadata).toEqual(metadata);
    expect(
      buildArtifactModule.isReusableBuildArtifact({
        metadata: reloadedMetadata,
        commitSha: "abc123def456",
      }),
    ).toBe(true);
    expect(
      buildArtifactModule.isReusableBuildArtifact({
        metadata: reloadedMetadata,
        commitSha: "other-commit",
      }),
    ).toBe(false);
  });

  it("reads the current git commit from HEAD refs", async () => {
    const tempDir = await createTempDir();
    const gitDir = path.join(tempDir, ".git");

    await fs.mkdir(path.join(gitDir, "refs", "heads"), {
      recursive: true,
    });
    await fs.writeFile(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n", "utf8");
    await fs.writeFile(
      path.join(gitDir, "refs", "heads", "main"),
      "deadbeef1234567890\n",
      "utf8",
    );

    await expect(buildArtifactModule.readCurrentGitCommit(tempDir)).resolves.toBe(
      "deadbeef1234567890",
    );
  });

  it("copies build artifacts without cache directories", async () => {
    const tempDir = await createTempDir();
    const sourceDistDir = path.join(tempDir, ".next");
    const targetDistDir = path.join(tempDir, ".next-runtime.stage");

    await fs.mkdir(path.join(sourceDistDir, "cache"), {
      recursive: true,
    });
    await fs.mkdir(path.join(sourceDistDir, "server"), {
      recursive: true,
    });
    await fs.writeFile(path.join(sourceDistDir, "BUILD_ID"), "build-1", "utf8");
    await fs.writeFile(
      path.join(sourceDistDir, "cache", "temp.txt"),
      "cache-data",
      "utf8",
    );
    await fs.writeFile(
      path.join(sourceDistDir, "server", "manifest.json"),
      "{}",
      "utf8",
    );
    await buildArtifactModule.writeBuildArtifactMetadata({
      distDir: sourceDistDir,
      commitSha: "abc123def456",
    });

    await buildArtifactModule.copyBuildArtifact({
      sourceDistDir,
      targetDistDir,
    });

    await expect(fs.readFile(path.join(targetDistDir, "BUILD_ID"), "utf8")).resolves.toBe(
      "build-1",
    );
    await expect(
      fs.readFile(path.join(targetDistDir, "server", "manifest.json"), "utf8"),
    ).resolves.toBe("{}");
    await expect(
      fs.access(path.join(targetDistDir, ".open-interview-build-meta.json")),
    ).resolves.toBeUndefined();
    await expect(fs.access(path.join(targetDistDir, "cache"))).rejects.toThrow();
  });
});
