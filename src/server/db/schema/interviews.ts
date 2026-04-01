import {
  index,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import {
  createdAtColumn,
  idColumn,
  interviewQuestionLinkTypes,
  nullableIntegerColumn,
  sourceDocumentStatuses,
  updatedAtColumn,
} from "@/server/db/schema/_common";
import { sourceDocuments } from "@/server/db/schema/source-documents";
import { tags } from "@/server/db/schema/tags";
import { questionItems } from "@/server/db/schema/questions";

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

export const interviewQuestions = sqliteTable(
  "interview_questions",
  {
    id: idColumn(),
    interviewExperienceId: text("interview_experience_id")
      .notNull()
      .references(() => interviewExperiences.id, { onDelete: "cascade" }),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    questionText: text("question_text").notNull(),
    normalizedQuestionText: text("normalized_question_text").notNull(),
    sourceAnswer: text("source_answer"),
    sourceSnippet: text("source_snippet"),
    sourceOrder: nullableIntegerColumn("source_order"),
    category: text("category"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("interview_questions_interview_idx").on(
      table.interviewExperienceId,
      table.sourceOrder,
    ),
    index("interview_questions_source_document_idx").on(table.sourceDocumentId),
    index("interview_questions_normalized_question_text_idx").on(
      table.normalizedQuestionText,
    ),
  ],
);

export const interviewQuestionTags = sqliteTable(
  "interview_question_tags",
  {
    interviewQuestionId: text("interview_question_id")
      .notNull()
      .references(() => interviewQuestions.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.interviewQuestionId, table.tagId],
      name: "interview_question_tags_pk",
    }),
    index("interview_question_tags_tag_idx").on(table.tagId),
  ],
);

export const interviewQuestionLinks = sqliteTable(
  "interview_question_links",
  {
    id: idColumn(),
    interviewQuestionId: text("interview_question_id")
      .notNull()
      .references(() => interviewQuestions.id, { onDelete: "cascade" }),
    questionItemId: text("question_item_id")
      .notNull()
      .references(() => questionItems.id, { onDelete: "cascade" }),
    linkType: text("link_type", { enum: interviewQuestionLinkTypes }).notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("interview_question_links_uq").on(
      table.interviewQuestionId,
      table.questionItemId,
      table.linkType,
    ),
    index("interview_question_links_interview_question_idx").on(
      table.interviewQuestionId,
    ),
    index("interview_question_links_question_item_idx").on(table.questionItemId),
  ],
);
