import fs from "node:fs";
import path from "node:path";

import {
  readCurrentGitCommit,
  resolveBuildDistDir,
  writeBuildArtifactMetadata,
} from "./build/build-artifact.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const distDirArg = process.argv[2];
const distDir = distDirArg?.trim() || resolveBuildDistDir(process.env);
const absoluteDistDir = path.resolve(rootDir, distDir);

if (!fs.existsSync(path.join(absoluteDistDir, "BUILD_ID"))) {
  process.stderr.write(
    `[build] Cannot record metadata because BUILD_ID is missing in ${distDir}\n`,
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
