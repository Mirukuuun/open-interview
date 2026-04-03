import fs from "node:fs/promises";
import path from "node:path";

export const buildArtifactMetadataFileName = ".open-interview-build-meta.json";

export function resolveBuildDistDir(env = process.env) {
  const runtimeDistDir = env.NEXT_DIST_DIR?.trim();

  return runtimeDistDir && runtimeDistDir.length > 0 ? runtimeDistDir : ".next";
}

export function resolveBuildArtifactMetadataPath(distDir) {
  return path.join(distDir, buildArtifactMetadataFileName);
}

async function resolveGitDir(rootDir) {
  const gitPath = path.join(rootDir, ".git");
  const gitStat = await fs.stat(gitPath);

  if (gitStat.isDirectory()) {
    return gitPath;
  }

  const gitFileText = await fs.readFile(gitPath, "utf8");
  const gitDirMatch = gitFileText.match(/^gitdir:\s*(.+)\s*$/mu);

  if (!gitDirMatch?.[1]) {
    throw new Error(`Unsupported .git file format at ${gitPath}`);
  }

  return path.resolve(rootDir, gitDirMatch[1]);
}

export async function readCurrentGitCommit(rootDir) {
  const gitDir = await resolveGitDir(rootDir);
  const headText = (await fs.readFile(path.join(gitDir, "HEAD"), "utf8")).trim();

  if (!headText.startsWith("ref: ")) {
    return headText;
  }

  const refName = headText.slice("ref: ".length).trim();
  const refPath = path.join(gitDir, refName);

  try {
    return (await fs.readFile(refPath, "utf8")).trim();
  } catch {
    const packedRefsText = await fs.readFile(path.join(gitDir, "packed-refs"), "utf8");
    const packedRefLine = packedRefsText
      .split("\n")
      .find(
        (line) =>
          line.length > 0 &&
          !line.startsWith("#") &&
          !line.startsWith("^") &&
          line.trim().endsWith(` ${refName}`),
      )
      ?.trim();

    if (!packedRefLine) {
      throw new Error(`Could not resolve git ref ${refName}`);
    }

    const [commitSha, packedRefName] = packedRefLine.split(" ");

    if (packedRefName !== refName || !commitSha) {
      throw new Error(`Could not resolve git ref ${refName}`);
    }

    return commitSha.trim();
  }
}

export async function readBuildArtifactMetadata(distDir) {
  try {
    const metadataText = await fs.readFile(
      resolveBuildArtifactMetadataPath(distDir),
      "utf8",
    );

    return JSON.parse(metadataText);
  } catch {
    return null;
  }
}

export async function writeBuildArtifactMetadata(input) {
  const metadata = {
    schemaVersion: 1,
    commitSha: input.commitSha,
    nodeVersion: input.nodeVersion ?? process.version,
    distDirName: path.basename(input.distDir),
    createdAt: new Date().toISOString(),
  };

  await fs.mkdir(input.distDir, {
    recursive: true,
  });
  await fs.writeFile(
    resolveBuildArtifactMetadataPath(input.distDir),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );

  return metadata;
}

export function isReusableBuildArtifact(input) {
  return (
    Boolean(input.metadata) &&
    input.metadata.schemaVersion === 1 &&
    typeof input.metadata.commitSha === "string" &&
    input.metadata.commitSha === input.commitSha
  );
}

export async function copyBuildArtifact(input) {
  await fs.rm(input.targetDistDir, {
    recursive: true,
    force: true,
  });
  await fs.cp(input.sourceDistDir, input.targetDistDir, {
    recursive: true,
    force: true,
    filter(sourcePath) {
      return path.basename(sourcePath) !== "cache";
    },
  });
}
