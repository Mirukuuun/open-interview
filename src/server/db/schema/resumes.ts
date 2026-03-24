import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import {
  createdAtColumn,
  idColumn,
  updatedAtColumn,
} from "@/server/db/schema/_common";
import { sourceDocuments } from "@/server/db/schema/source-documents";

export const resumeDocuments = sqliteTable(
  "resume_documents",
  {
    id: idColumn(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    candidateName: text("candidate_name"),
    summary: text("summary"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("resume_documents_source_document_id_uq").on(table.sourceDocumentId),
    index("resume_documents_updated_at_idx").on(table.updatedAt),
  ],
);

export const resumeProjects = sqliteTable(
  "resume_projects",
  {
    id: idColumn(),
    resumeDocumentId: text("resume_document_id")
      .notNull()
      .references(() => resumeDocuments.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    summary: text("summary"),
    highlightsJson: text("highlights_json"),
    techStackJson: text("tech_stack_json"),
    deepDiveQuestionsJson: text("deep_dive_questions_json"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("resume_projects_resume_document_idx").on(table.resumeDocumentId),
    index("resume_projects_name_idx").on(table.name),
    index("resume_projects_updated_at_idx").on(table.updatedAt),
  ],
);
