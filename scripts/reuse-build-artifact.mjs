import fs from "node:fs/promises";
import path from "node:path";

import {
  copyBuildArtifact,
  isReusableBuildArtifact,
  readCurrentGitCommit,
  readBuildArtifactMetadata,
} from "./build/build-artifact.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const sourceDistDirArg = process.argv[2];
const targetDistDirArg = process.argv[3];

if (!sourceDistDirArg || !targetDistDirArg) {
  process.stderr.write(
    "Usage: node scripts/reuse-build-artifact.mjs <sourceDistDir> <targetDistDir>\n",
  );
  process.exit(2);
}

const sourceDistDir = path.resolve(rootDir, sourceDistDirArg);
const targetDistDir = path.resolve(rootDir, targetDistDirArg);
const buildIdPath = path.join(sourceDistDir, "BUILD_ID");
const metadata = await readBuildArtifactMetadata(sourceDistDir);

try {
  await fs.access(buildIdPath);
} catch {
  process.stderr.write(
    `[deploy] reusable build missing BUILD_ID in ${sourceDistDirArg}\n`,
  );
  process.exit(1);
}

const commitSha = await readCurrentGitCommit(rootDir);

if (!isReusableBuildArtifact({ metadata, commitSha })) {
  const metadataCommit = metadata?.commitSha ?? "none";

  process.stderr.write(
    `[deploy] reusable build metadata mismatch: expected ${commitSha.slice(0, 7)}, got ${String(metadataCommit).slice(0, 7)}\n`,
  );
  process.exit(1);
}

await copyBuildArtifact({
  sourceDistDir,
  targetDistDir,
});

process.stdout.write(
  `[deploy] reused build artifact ${sourceDistDirArg} -> ${targetDistDirArg} for ${commitSha.slice(0, 7)}\n`,
);
