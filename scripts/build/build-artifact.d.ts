export type BuildArtifactMetadata = {
  schemaVersion: 1;
  commitSha: string;
  nodeVersion: string;
  distDirName: string;
  createdAt: string;
};

export function resolveBuildDistDir(
  env?: Record<string, string | undefined>,
): string;

export function resolveBuildArtifactMetadataPath(distDir: string): string;

export function readBuildArtifactMetadata(
  distDir: string,
): Promise<BuildArtifactMetadata | null>;

export function readCurrentGitCommit(rootDir: string): Promise<string>;

export function writeBuildArtifactMetadata(input: {
  distDir: string;
  commitSha: string;
  nodeVersion?: string;
}): Promise<BuildArtifactMetadata>;

export function isReusableBuildArtifact(input: {
  metadata: BuildArtifactMetadata | null;
  commitSha: string;
}): boolean;

export function copyBuildArtifact(input: {
  sourceDistDir: string;
  targetDistDir: string;
}): Promise<void>;
