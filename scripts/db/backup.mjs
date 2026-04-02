import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const rootDir = path.resolve(import.meta.dirname, "..", "..");

function resolveDatabasePath() {
  const configuredPath =
    process.env.OPEN_INTERVIEW_DB_PATH ?? process.env.DATABASE_URL;

  if (configuredPath && configuredPath.trim().length > 0) {
    if (configuredPath.startsWith("file:")) {
      return fileURLToPath(configuredPath);
    }

    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(rootDir, configuredPath);
  }

  return path.join(rootDir, "storage", "open-interview.sqlite");
}

function resolveBackupDirectory() {
  if (
    process.env.OPEN_INTERVIEW_BACKUP_DIR &&
    process.env.OPEN_INTERVIEW_BACKUP_DIR.trim().length > 0
  ) {
    return path.isAbsolute(process.env.OPEN_INTERVIEW_BACKUP_DIR)
      ? process.env.OPEN_INTERVIEW_BACKUP_DIR
      : path.resolve(rootDir, process.env.OPEN_INTERVIEW_BACKUP_DIR);
  }

  return path.join(rootDir, "storage", "backups");
}

function toTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

const databasePath = resolveDatabasePath();

if (!fs.existsSync(databasePath)) {
  throw new Error(`SQLite database was not found at ${databasePath}`);
}

const backupDirectory = resolveBackupDirectory();
fs.mkdirSync(backupDirectory, { recursive: true });

const backupPath = path.join(
  backupDirectory,
  `open-interview-${toTimestamp()}.sqlite`,
);

const sqlite = new Database(databasePath, {
  fileMustExist: true,
});

sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("wal_checkpoint(FULL)");
sqlite.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
sqlite.close();

process.stdout.write(`SQLite backup created at ${backupPath}\n`);
