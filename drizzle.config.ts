import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "drizzle-kit";

function resolveDatabasePath() {
  const configuredPath =
    process.env.OPEN_INTERVIEW_DB_PATH ?? process.env.DATABASE_URL;

  if (configuredPath && configuredPath.trim().length > 0) {
    if (configuredPath.startsWith("file:")) {
      return fileURLToPath(configuredPath);
    }

    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), "storage", "open-interview.sqlite");
}

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: resolveDatabasePath(),
  },
  verbose: true,
  strict: true,
});
