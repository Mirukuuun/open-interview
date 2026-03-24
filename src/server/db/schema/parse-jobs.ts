import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import {
  createdAtColumn,
  idColumn,
  parseJobProviders,
  parseJobStatuses,
  parseJobTypes,
  updatedAtColumn,
} from "@/server/db/schema/_common";
import { sourceDocuments } from "@/server/db/schema/source-documents";

export const parseJobs = sqliteTable(
  "parse_jobs",
  {
    id: idColumn(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    jobType: text("job_type", { enum: parseJobTypes }).notNull(),
    provider: text("provider", { enum: parseJobProviders })
      .notNull()
      .default("openclaw"),
    status: text("status", { enum: parseJobStatuses })
      .notNull()
      .default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    promptVersion: text("prompt_version"),
    errorMessage: text("error_message"),
    resultJson: text("result_json"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
  },
  (table) => [
    index("parse_jobs_source_document_idx").on(table.sourceDocumentId),
    index("parse_jobs_status_idx").on(table.status),
    index("parse_jobs_created_at_idx").on(table.createdAt),
  ],
);
