import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import {
  aiSessionStatuses,
  aiSessionTypes,
  createdAtColumn,
  idColumn,
  parseJobProviders,
  qaAnswerModes,
  sessionTurnRoles,
  updatedAtColumn,
} from "@/server/db/schema/_common";
import { resumeProjects } from "@/server/db/schema/resumes";
import { retrievalLogs } from "@/server/db/schema/retrieval";

export const aiSessions = sqliteTable(
  "ai_sessions",
  {
    id: idColumn(),
    sessionType: text("session_type", { enum: aiSessionTypes }).notNull(),
    status: text("status", { enum: aiSessionStatuses }).notNull().default("active"),
    relatedResumeProjectId: text("related_resume_project_id").references(
      () => resumeProjects.id,
      { onDelete: "set null" },
    ),
    provider: text("provider", { enum: parseJobProviders })
      .notNull()
      .default("openclaw"),
    title: text("title"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("ai_sessions_session_type_idx").on(table.sessionType),
    index("ai_sessions_status_idx").on(table.status),
    index("ai_sessions_updated_at_idx").on(table.updatedAt),
  ],
);

export const sessionTurns = sqliteTable(
  "session_turns",
  {
    id: idColumn(),
    aiSessionId: text("ai_session_id")
      .notNull()
      .references(() => aiSessions.id, { onDelete: "cascade" }),
    role: text("role", { enum: sessionTurnRoles }).notNull(),
    content: text("content").notNull(),
    citationsJson: text("citations_json"),
    answerMode: text("answer_mode", { enum: qaAnswerModes }),
    supportSummary: text("support_summary"),
    retrievalLogId: text("retrieval_log_id").references(() => retrievalLogs.id, {
      onDelete: "set null",
    }),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("session_turns_ai_session_idx").on(table.aiSessionId, table.createdAt),
    index("session_turns_retrieval_log_idx").on(table.retrievalLogId),
  ],
);
