import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const rootDir = path.resolve(import.meta.dirname, "..", "..");
const migrationsDir = path.join(rootDir, "src", "server", "db", "migrations");

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

function ensureMigrationsTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS __oi_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
}

function applyMigrations(database) {
  const insertMigration = database.prepare(`
    INSERT INTO __oi_migrations (name, checksum, applied_at)
    VALUES (?, ?, ?)
  `);

  const readMigration = database.prepare(`
    SELECT checksum
    FROM __oi_migrations
    WHERE name = ?
  `);

  const runMigration = database.transaction((fileName, checksum, sqlText) => {
    database.exec(sqlText);
    insertMigration.run(fileName, checksum, new Date().toISOString());
  });

  for (const fileName of listMigrationFiles()) {
    const filePath = path.join(migrationsDir, fileName);
    const sqlText = fs.readFileSync(filePath, "utf8");
    const checksum = createHash("sha256").update(sqlText).digest("hex");
    const existing = readMigration.get(fileName);

    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(
          `Migration ${fileName} has changed after being applied. ` +
            "Create a new migration instead of editing an existing one.",
        );
      }

      continue;
    }

    runMigration(fileName, checksum, sqlText);
    process.stdout.write(`Applied migration ${fileName}\n`);
  }
}

const databasePath = resolveDatabasePath();
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

ensureMigrationsTable(sqlite);
applyMigrations(sqlite);

sqlite.close();

process.stdout.write(`SQLite database ready at ${databasePath}\n`);
