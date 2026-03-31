import { index, sqliteTable, text, uniqueIndex, real } from "drizzle-orm/sqlite-core";

import {
  createdAtColumn,
  idColumn,
  updatedAtColumn,
} from "@/server/db/schema/_common";
import { practiceDimensionKeys } from "@/lib/practice-dimensions";

export const practiceProfiles = sqliteTable(
  "practice_profiles",
  {
    id: idColumn(),
    scope: text("scope").notNull(),
    dimensionCatalogVersion: text("dimension_catalog_version").notNull(),
    lastExamSessionId: text("last_exam_session_id"),
    lastAssessedAt: text("last_assessed_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("practice_profiles_scope_uq").on(table.scope)],
);

export const practiceProfileDimensions = sqliteTable(
  "practice_profile_dimensions",
  {
    id: idColumn(),
    practiceProfileId: text("practice_profile_id")
      .notNull()
      .references(() => practiceProfiles.id, { onDelete: "cascade" }),
    dimensionKey: text("dimension_key", { enum: practiceDimensionKeys }).notNull(),
    score: real("score").notNull().default(0),
    evidenceCount: real("evidence_count").notNull().default(0),
    lastExamScore: real("last_exam_score"),
    lastCoverageWeight: real("last_coverage_weight"),
    lastAssessedAt: text("last_assessed_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("practice_profile_dimensions_profile_dimension_uq").on(
      table.practiceProfileId,
      table.dimensionKey,
    ),
    index("practice_profile_dimensions_profile_idx").on(
      table.practiceProfileId,
      table.dimensionKey,
    ),
  ],
);
