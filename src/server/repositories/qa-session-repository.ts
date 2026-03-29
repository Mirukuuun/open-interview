import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/client";
import { aiSessions, sessionTurns } from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";

/**
 * [POS] 维护 QA / deep-dive 等 AI session 与 session turns 的 SQLite 持久化边界。
 * [IN] session / turn 的创建、状态更新、列表查询等仓储级输入。
 * [OUT] 返回稳定的 session / turn 记录，并负责维护 updatedAt 等持久化副作用。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

const createSessionInputSchema = z.object({
  id: z.string().min(1).optional(),
  sessionType: z
    .enum(["qa", "resume_deep_dive", "mock_interview"])
    .default("qa"),
  status: z.enum(["active", "completed", "archived"]).default("active"),
  provider: z.literal("openclaw").default("openclaw"),
  title: z.string().min(1).nullable().optional(),
  relatedResumeProjectId: z.string().min(1).nullable().optional(),
});

const createSessionTurnInputSchema = z.object({
  id: z.string().min(1).optional(),
  aiSessionId: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  citationsJson: z.string().min(2).nullable().optional(),
  answerMode: z
    .enum(["grounded_answered", "weak_support", "no_grounded_support"])
    .nullable()
    .optional(),
  supportSummary: z.string().min(1).nullable().optional(),
  retrievalLogId: z.string().min(1).nullable().optional(),
});

const sessionStatusSchema = z.enum(["active", "completed", "archived"]);

function getSessionById(id: string) {
  return db
    .select()
    .from(aiSessions)
    .where(eq(aiSessions.id, id))
    .limit(1)
    .all()[0];
}

export const qaSessionRepository = {
  create(input: z.input<typeof createSessionInputSchema>) {
    const value = createSessionInputSchema.parse(input);
    const timestamp = nowUtcIso();
    const session = {
      id: value.id ?? createOpaqueId("sess"),
      sessionType: value.sessionType,
      status: value.status,
      relatedResumeProjectId: value.relatedResumeProjectId ?? null,
      provider: value.provider,
      title: value.title ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.insert(aiSessions).values(session).run();

    return session;
  },

  findById(id: string) {
    return getSessionById(id);
  },

  updateStatus(sessionId: string, status: z.infer<typeof sessionStatusSchema>) {
    const nextStatus = sessionStatusSchema.parse(status);

    db.update(aiSessions)
      .set({
        status: nextStatus,
        updatedAt: nowUtcIso(),
      })
      .where(eq(aiSessions.id, sessionId))
      .run();

    return getSessionById(sessionId);
  },

  archive(sessionId: string) {
    return qaSessionRepository.updateStatus(sessionId, "archived");
  },

  updateTitle(sessionId: string, title: string | null) {
    db.update(aiSessions)
      .set({
        title,
        updatedAt: nowUtcIso(),
      })
      .where(eq(aiSessions.id, sessionId))
      .run();

    return getSessionById(sessionId);
  },

  touch(sessionId: string) {
    db.update(aiSessions)
      .set({
        updatedAt: nowUtcIso(),
      })
      .where(eq(aiSessions.id, sessionId))
      .run();
  },

  createTurn(input: z.input<typeof createSessionTurnInputSchema>) {
    const value = createSessionTurnInputSchema.parse(input);
    const turn = {
      id: value.id ?? createOpaqueId("turn"),
      aiSessionId: value.aiSessionId,
      role: value.role,
      content: value.content,
      citationsJson: value.citationsJson ?? null,
      answerMode: value.answerMode ?? null,
      supportSummary: value.supportSummary ?? null,
      retrievalLogId: value.retrievalLogId ?? null,
      createdAt: nowUtcIso(),
    };

    db.insert(sessionTurns).values(turn).run();
    qaSessionRepository.touch(value.aiSessionId);

    return turn;
  },

  listTurns(sessionId: string) {
    return db
      .select()
      .from(sessionTurns)
      .where(eq(sessionTurns.aiSessionId, sessionId))
      .orderBy(sessionTurns.createdAt)
      .all();
  },

  listRecent(limit = 10) {
    return db
      .select({
        id: aiSessions.id,
        sessionType: aiSessions.sessionType,
        status: aiSessions.status,
        provider: aiSessions.provider,
        title: aiSessions.title,
        createdAt: aiSessions.createdAt,
        updatedAt: aiSessions.updatedAt,
        turnCount: count(sessionTurns.id),
        latestUserQuery: sql<string | null>`
          (
            SELECT st.content
            FROM session_turns st
            WHERE st.ai_session_id = ${aiSessions.id}
              AND st.role = 'user'
            ORDER BY st.created_at DESC
            LIMIT 1
          )
        `,
      })
      .from(aiSessions)
      .leftJoin(sessionTurns, eq(sessionTurns.aiSessionId, aiSessions.id))
      .where(
        and(eq(aiSessions.sessionType, "qa"), eq(aiSessions.status, "active")),
      )
      .groupBy(aiSessions.id)
      .orderBy(desc(aiSessions.updatedAt))
      .limit(limit)
      .all()
      .map((row) => ({
        ...row,
        turnCount: Number(row.turnCount),
      }));
  },

  listByRelatedResumeProject(projectId: string, limit = 12) {
    return db
      .select({
        id: aiSessions.id,
        sessionType: aiSessions.sessionType,
        status: aiSessions.status,
        provider: aiSessions.provider,
        relatedResumeProjectId: aiSessions.relatedResumeProjectId,
        title: aiSessions.title,
        createdAt: aiSessions.createdAt,
        updatedAt: aiSessions.updatedAt,
        turnCount: count(sessionTurns.id),
        latestAssistantTurn: sql<string | null>`
          (
            SELECT st.content
            FROM session_turns st
            WHERE st.ai_session_id = ${aiSessions.id}
              AND st.role = 'assistant'
            ORDER BY st.created_at DESC
            LIMIT 1
          )
        `,
        latestUserTurn: sql<string | null>`
          (
            SELECT st.content
            FROM session_turns st
            WHERE st.ai_session_id = ${aiSessions.id}
              AND st.role = 'user'
            ORDER BY st.created_at DESC
            LIMIT 1
          )
        `,
      })
      .from(aiSessions)
      .leftJoin(sessionTurns, eq(sessionTurns.aiSessionId, aiSessions.id))
      .where(
        and(
          eq(aiSessions.sessionType, "resume_deep_dive"),
          eq(aiSessions.relatedResumeProjectId, projectId),
        ),
      )
      .groupBy(aiSessions.id)
      .orderBy(desc(aiSessions.updatedAt))
      .limit(limit)
      .all()
      .map((row) => ({
        ...row,
        turnCount: Number(row.turnCount),
      }));
  },

  countActiveQaSessions() {
    return Number(
      db
        .select({ count: count() })
        .from(aiSessions)
        .where(and(eq(aiSessions.sessionType, "qa"), eq(aiSessions.status, "active")))
        .all()[0]?.count ?? 0,
    );
  },
};
