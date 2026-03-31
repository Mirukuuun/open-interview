import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import {
  assessmentModes,
  assessmentStatuses,
  createdAtColumn,
  idColumn,
  parseJobProviders,
  questionDifficulties,
  updatedAtColumn,
} from "@/server/db/schema/_common";
import { questionItems } from "@/server/db/schema/questions";

export const assessmentSessions = sqliteTable(
  "assessment_sessions",
  {
    id: idColumn(),
    mode: text("mode", { enum: assessmentModes }).notNull().default("exam"),
    status: text("status", { enum: assessmentStatuses }).notNull().default("active"),
    questionCount: integer("question_count").notNull(),
    totalScore: integer("total_score"),
    maxScore: integer("max_score").notNull().default(100),
    summaryJson: text("summary_json"),
    scoringProvider: text("scoring_provider", { enum: parseJobProviders })
      .notNull()
      .default("openclaw"),
    startedAt: text("started_at").notNull(),
    submittedAt: text("submitted_at"),
    completedAt: text("completed_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("assessment_sessions_mode_idx").on(table.mode),
    index("assessment_sessions_status_idx").on(table.status),
    index("assessment_sessions_updated_at_idx").on(table.updatedAt),
  ],
);

export const assessmentItems = sqliteTable(
  "assessment_items",
  {
    id: idColumn(),
    assessmentSessionId: text("assessment_session_id")
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),
    questionItemId: text("question_item_id")
      .notNull()
      .references(() => questionItems.id),
    sequenceNo: integer("sequence_no").notNull(),
    questionTextSnapshot: text("question_text_snapshot").notNull(),
    canonicalAnswerSnapshot: text("canonical_answer_snapshot"),
    categorySnapshot: text("category_snapshot"),
    difficultySnapshot: text("difficulty_snapshot", { enum: questionDifficulties }),
    tagsJson: text("tags_json").notNull().default("[]"),
    dimensionWeightsJson: text("dimension_weights_json"),
    userAnswer: text("user_answer"),
    score: integer("score"),
    maxScore: integer("max_score").notNull().default(10),
    feedbackJson: text("feedback_json"),
    skillScoresJson: text("skill_scores_json"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("assessment_items_session_sequence_uq").on(
      table.assessmentSessionId,
      table.sequenceNo,
    ),
    index("assessment_items_session_idx").on(
      table.assessmentSessionId,
      table.sequenceNo,
    ),
    index("assessment_items_question_idx").on(table.questionItemId),
  ],
);
