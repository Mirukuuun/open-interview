import { index, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import {
  createdAtColumn,
  idColumn,
  sourceDocumentStatuses,
  updatedAtColumn,
} from "@/server/db/schema/_common";
import { sourceDocuments } from "@/server/db/schema/source-documents";
import { tags } from "@/server/db/schema/tags";

export const interviewExperiences = sqliteTable(
  "interview_experiences",
  {
    id: idColumn(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    company: text("company"),
    role: text("role"),
    roundInfo: text("round_info"),
    summary: text("summary"),
    status: text("status", { enum: sourceDocumentStatuses })
      .notNull()
      .default("active"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("interview_experiences_source_document_id_uq").on(
      table.sourceDocumentId,
    ),
    index("interview_experiences_company_idx").on(table.company),
    index("interview_experiences_updated_at_idx").on(table.updatedAt),
  ],
);

export const interviewTags = sqliteTable(
  "interview_tags",
  {
    interviewExperienceId: text("interview_experience_id")
      .notNull()
      .references(() => interviewExperiences.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.interviewExperienceId, table.tagId],
      name: "interview_tags_pk",
    }),
    index("interview_tags_tag_idx").on(table.tagId),
  ],
);
