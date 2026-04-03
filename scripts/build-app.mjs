import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  readCurrentGitCommit,
  resolveBuildDistDir,
  writeBuildArtifactMetadata,
} from "./build/build-artifact.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const distDir = resolveBuildDistDir(process.env);
const absoluteDistDir = path.resolve(rootDir, distDir);
const nextBinPath = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");

const buildResult = spawnSync(process.execPath, [nextBinPath, "build"], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

if (!fs.existsSync(path.join(absoluteDistDir, "BUILD_ID"))) {
  process.stderr.write(
    `[build] Expected BUILD_ID in ${absoluteDistDir}, but it was not found.\n`,
  );
  process.exit(1);
}

const commitSha = await readCurrentGitCommit(rootDir);

await writeBuildArtifactMetadata({
  distDir: absoluteDistDir,
  commitSha,
});

process.stdout.write(
  `[build] recorded artifact metadata for ${commitSha.slice(0, 7)} in ${distDir}\n`,
);
