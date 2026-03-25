import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import {
  answerVariantAuthorTypes,
  answerVariantTypes,
  createdAtColumn,
  idColumn,
  nullableIntegerColumn,
  questionCreatedFromKinds,
  questionDifficulties,
  questionReviewStatuses,
  updatedAtColumn,
} from "@/server/db/schema/_common";
import { sourceDocuments } from "@/server/db/schema/source-documents";

export const questionItems = sqliteTable(
  "question_items",
  {
    id: idColumn(),
    questionText: text("question_text").notNull(),
    normalizedQuestionText: text("normalized_question_text").notNull(),
    canonicalAnswer: text("canonical_answer"),
    category: text("category"),
    difficulty: text("difficulty", { enum: questionDifficulties }),
    sourceCount: integer("source_count").notNull().default(0),
    answerVariantCount: integer("answer_variant_count").notNull().default(0),
    reviewStatus: text("review_status", { enum: questionReviewStatuses })
      .notNull()
      .default("draft"),
    createdFrom: text("created_from", { enum: questionCreatedFromKinds })
      .notNull()
      .default("manual"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("question_items_normalized_question_text_uq").on(
      table.normalizedQuestionText,
    ),
    index("question_items_category_idx").on(table.category),
    index("question_items_review_status_idx").on(table.reviewStatus),
    index("question_items_updated_at_idx").on(table.updatedAt),
  ],
);

export const answerVariants = sqliteTable(
  "answer_variants",
  {
    id: idColumn(),
    questionItemId: text("question_item_id")
      .notNull()
      .references(() => questionItems.id, { onDelete: "cascade" }),
    variantType: text("variant_type", { enum: answerVariantTypes }).notNull(),
    content: text("content").notNull(),
    authorType: text("author_type", { enum: answerVariantAuthorTypes }).notNull(),
    status: text("status", { enum: ["active", "archived"] as const })
      .notNull()
      .default("active"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("answer_variants_question_item_idx").on(table.questionItemId),
    index("answer_variants_variant_type_idx").on(table.variantType),
  ],
);

export const questionCategories = sqliteTable(
  "question_categories",
  {
    questionItemId: text("question_item_id")
      .notNull()
      .references(() => questionItems.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.questionItemId, table.normalizedName],
      name: "question_categories_pk",
    }),
    index("question_categories_normalized_name_idx").on(table.normalizedName),
  ],
);

export const sourceQuestionRefs = sqliteTable(
  "source_question_refs",
  {
    id: idColumn(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    questionItemId: text("question_item_id")
      .notNull()
      .references(() => questionItems.id, { onDelete: "cascade" }),
    sourceSnippet: text("source_snippet"),
    sourceOrder: nullableIntegerColumn("source_order"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("source_question_refs_source_question_uq").on(
      table.sourceDocumentId,
      table.questionItemId,
    ),
    index("source_question_refs_question_item_idx").on(table.questionItemId),
    index("source_question_refs_source_order_idx").on(table.sourceOrder),
  ],
);
