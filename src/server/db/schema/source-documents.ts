import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import {
  createdAtColumn,
  idColumn,
  sourceDocumentKinds,
  sourceDocumentParseStatuses,
  sourceDocumentStatuses,
  updatedAtColumn,
} from "@/server/db/schema/_common";

export const sourceDocuments = sqliteTable(
  "source_documents",
  {
    id: idColumn(),
    kind: text("kind", { enum: sourceDocumentKinds }).notNull(),
    title: text("title").notNull(),
    rawText: text("raw_text").notNull(),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    filePath: text("file_path"),
    sourceUrl: text("source_url"),
    language: text("language"),
    status: text("status", { enum: sourceDocumentStatuses })
      .notNull()
      .default("active"),
    parseStatus: text("parse_status", { enum: sourceDocumentParseStatuses })
      .notNull()
      .default("not_started"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("source_documents_kind_idx").on(table.kind),
    index("source_documents_parse_status_idx").on(table.parseStatus),
    index("source_documents_status_idx").on(table.status),
  ],
);
