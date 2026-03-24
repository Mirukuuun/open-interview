import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { ensureDatabaseDirectory, getDatabaseFilePath } from "@/server/db/paths";
import * as schema from "@/server/db/schema";

const globalForDatabase = globalThis as {
  openInterviewSqlite?: InstanceType<typeof Database>;
};

function createSqliteConnection() {
  ensureDatabaseDirectory();

  const sqlite = new Database(getDatabaseFilePath());

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return sqlite;
}

export const sqlite =
  globalForDatabase.openInterviewSqlite ?? createSqliteConnection();

if (!globalForDatabase.openInterviewSqlite) {
  globalForDatabase.openInterviewSqlite = sqlite;
}

export const db = drizzle(sqlite, {
  schema,
});

export type DbClient = typeof db;
