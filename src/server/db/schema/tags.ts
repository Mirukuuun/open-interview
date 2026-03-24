import { index, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import {
  createdAtColumn,
  tagTypes,
} from "@/server/db/schema/_common";
import { questionItems } from "@/server/db/schema/questions";

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    tagType: text("tag_type", { enum: tagTypes })
      .notNull()
      .default("custom"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("tags_normalized_name_uq").on(table.normalizedName),
    index("tags_tag_type_idx").on(table.tagType),
  ],
);

export const questionTags = sqliteTable(
  "question_tags",
  {
    questionItemId: text("question_item_id")
      .notNull()
      .references(() => questionItems.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.questionItemId, table.tagId],
      name: "question_tags_pk",
    }),
    index("question_tags_tag_idx").on(table.tagId),
  ],
);
