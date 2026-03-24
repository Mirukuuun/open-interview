import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DATABASE_PATH = path.join(
  process.cwd(),
  "storage",
  "open-interview.sqlite",
);

export function getDatabaseFilePath() {
  const configuredPath =
    process.env.OPEN_INTERVIEW_DB_PATH ?? process.env.DATABASE_URL;

  if (!configuredPath || configuredPath.trim().length === 0) {
    return DEFAULT_DATABASE_PATH;
  }

  if (configuredPath.startsWith("file:")) {
    return fileURLToPath(configuredPath);
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

export function getMigrationDirectoryPath() {
  return path.join(process.cwd(), "src", "server", "db", "migrations");
}

export function ensureDatabaseDirectory() {
  fs.mkdirSync(path.dirname(getDatabaseFilePath()), { recursive: true });
}
