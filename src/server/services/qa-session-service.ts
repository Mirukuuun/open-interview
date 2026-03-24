import { count, eq } from "drizzle-orm";

import type {
  AskQaSessionRequest,
  QaCitation,
  RetrievalLog,
} from "@/lib/schemas/qa";
import {
  qaCitationSchema,
  qaSessionSchema,
  qaSessionTurnSchema,
  retrievalFinalContextSchema,
  retrievalHitSchema,
  retrievalLogSchema,
} from "@/lib/schemas/qa";
import { openClawGroundedQaAdapter } from "@/server/adapters/openclaw/generate-grounded-qa";
import { db, sqlite } from "@/server/db/client";
import { questionItems } from "@/server/db/schema";
import { questionBrowseRepository } from "@/server/repositories/question-browse-repository";
import {
  chunkRepository,
  qaSessionRepository,
  retrievalLogRepository,
} from "@/server/repositories";
import { retrieveHybridQaContext } from "@/server/retrieval/hybrid-qa-retrieval";

export class QaSessionServiceError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "QaSessionServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function truncateText(value: string, maxLength: number) {
  const compactValue = value.replace(/\s+/g, " ").trim();

  if (compactValue.length <= maxLength) {
    return compactValue;
  }

  return `${compactValue.slice(0, maxLength - 3).trimEnd()}...`;
}

function parseJsonArray<T>(value: string | null | undefined, fallback: T[] = []) {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function toApiSession(
  session: NonNullable<ReturnType<typeof qaSessionRepository.findById>>,
) {
  return qaSessionSchema.parse({
    id: session.id,
    session_type: session.sessionType,
    status: session.status,
    provider: session.provider,
    title: session.title,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  });
}

function parseRetrievalLog(
  retrievalLog: ReturnType<typeof retrievalLogRepository.findById> | null,
): RetrievalLog | null {
  if (!retrievalLog) {
    return null;
  }

  const hits = retrievalHitSchema.array().safeParse(
    parseJsonArray(retrievalLog.hitsJson),
  );
  const finalContext = retrievalFinalContextSchema.safeParse(
    (() => {
      try {
        return JSON.parse(retrievalLog.finalContextJson);
      } catch {
        return {};
      }
    })(),
  );

  if (!hits.success || !finalContext.success) {
    return null;
  }

  return retrievalLogSchema.parse({
    id: retrievalLog.id,
    query_text: retrievalLog.queryText,
    query_type: retrievalLog.queryType,
    strategy: retrievalLog.strategy,
    hits: hits.data,
    final_context: finalContext.data,
    created_at: retrievalLog.createdAt,
  });
}

function resolveRelatedQuestions(questionIds: string[]) {
  return questionIds
    .map((questionId) => questionBrowseRepository.findById(questionId))
    .filter(
      (
        question,
      ): question is NonNullable<ReturnType<typeof questionBrowseRepository.findById>> =>
        question !== undefined,
    )
    .map((question) => ({
      id: question.id,
      question_text: question.questionText,
      category: question.category,
      source_count: question.sourceCount,
      tags: question.tags,
      shared_source_count: undefined,
    }));
}

function buildSessionTitle(title: string | null | undefined, fallbackQuery: string) {
  if (title && title.trim().length > 0) {
    return title.trim();
  }

  return truncateText(fallbackQuery, 72);
}

export const qaSessionService = {
  createSession(input: {
    title?: string | null;
  }) {
    const session = qaSessionRepository.create({
      title: input.title?.trim() ? input.title.trim() : null,
    });

    return toApiSession(session);
  },

  listRecentSessions(limit = 8) {
    return qaSessionRepository.listRecent(limit).map((session) => ({
      id: session.id,
      title: session.title,
      status: session.status,
      updatedAt: session.updatedAt,
      turnCount: session.turnCount,
      latestUserQuery: session.latestUserQuery,
    }));
  },

  getWorkspaceOverview() {
    const activeQuestionCount = Number(
      db
        .select({ count: count() })
        .from(questionItems)
        .where(eq(questionItems.reviewStatus, "active"))
        .all()[0]?.count ?? 0,
    );
    const chunkCounts = chunkRepository.countByChunkType();

    return {
      activeQuestionCount,
      activeSessionCount: qaSessionRepository.countActiveQaSessions(),
      totalChunkCount:
        chunkCounts.questionCount +
        chunkCounts.answerCount +
        chunkCounts.sourceExcerptCount,
      questionChunkCount: chunkCounts.questionCount,
      answerChunkCount: chunkCounts.answerCount,
      sourceExcerptChunkCount: chunkCounts.sourceExcerptCount,
    };
  },

  getSessionDetail(sessionId: string) {
    const session = qaSessionRepository.findById(sessionId);

    if (!session || session.sessionType !== "qa") {
      return undefined;
    }

    const turns = qaSessionRepository.listTurns(sessionId).map((turn) => {
      const citations = qaCitationSchema
        .array()
        .safeParse(parseJsonArray<QaCitation>(turn.citationsJson));
      const retrievalLog = parseRetrievalLog(
        turn.retrievalLogId ? retrievalLogRepository.findById(turn.retrievalLogId) : null,
      );
      const relatedQuestions = retrievalLog
        ? resolveRelatedQuestions(retrievalLog.final_context.related_question_ids)
        : [];

      return qaSessionTurnSchema.parse({
        id: turn.id,
        role: turn.role,
        content: turn.content,
        citations: citations.success ? citations.data : [],
        related_questions: relatedQuestions,
        retrieval_log_id: turn.retrievalLogId,
        retrieval_log: retrievalLog,
        created_at: turn.createdAt,
      });
    });

    return {
      aiSession: toApiSession(session),
      turns,
    };
  },

  async askQuestion(sessionId: string, input: AskQaSessionRequest) {
    const session = qaSessionRepository.findById(sessionId);

    if (!session || session.sessionType !== "qa") {
      throw new QaSessionServiceError("not_found", "QA session was not found.", 404);
    }

    if (session.status !== "active") {
      throw new QaSessionServiceError(
        "conflict",
        "Only active QA sessions can accept new questions.",
        409,
      );
    }

    const query = input.query.trim();
    const existingTurns = qaSessionRepository.listTurns(sessionId);
    const retrieval = retrieveHybridQaContext({
      query,
      topK: input.top_k,
      strategy: input.strategy,
    });

    if (retrieval.citations.length === 0) {
      throw new QaSessionServiceError(
        "retrieval_unavailable",
        "No grounded local citations were found for this query.",
        409,
        {
          strategy: input.strategy,
        },
      );
    }

    const groundedAnswer = await openClawGroundedQaAdapter.answer({
      query,
      sessionType: "qa",
      contextPacket: {
        hits: retrieval.hits.map((hit) => ({
          owner_type: hit.owner_type,
          owner_id: hit.owner_id,
          snippet: hit.snippet,
          score: hit.score,
        })),
        citations: retrieval.citations,
        relatedQuestions: retrieval.relatedQuestions.map((question) => ({
          id: question.id,
          question_text: question.questionText,
        })),
        sessionHistory: existingTurns
          .filter(
            (turn): turn is typeof turn & { role: "user" | "assistant" } =>
              turn.role === "user" || turn.role === "assistant",
          )
          .slice(-6)
          .map((turn) => ({
            role: turn.role,
            content: turn.content,
          })),
        questionContexts: retrieval.questions.map((question) => ({
          questionText: question.questionText,
          canonicalAnswer: question.canonicalAnswer,
          personalAnswer:
            question.answerVariants.find((variant) => variant.variantType === "personal")
              ?.content ?? null,
          sourceSnippet: question.sources[0]?.sourceSnippet ?? null,
        })),
      },
    });
    const citations = qaCitationSchema.array().parse(groundedAnswer.citations);
    const hits = retrievalHitSchema.array().parse(retrieval.hits);
    const finalContext = retrievalFinalContextSchema.parse(retrieval.finalContext);

    const savedResult = sqlite.transaction(() => {
      if (!session.title) {
        qaSessionRepository.updateTitle(sessionId, buildSessionTitle(session.title, query));
      }

      qaSessionRepository.createTurn({
        aiSessionId: sessionId,
        role: "user",
        content: query,
      });

      const retrievalLog = retrievalLogRepository.create({
        queryText: query,
        queryType: "qa",
        strategy: input.strategy,
        hitsJson: JSON.stringify(hits),
        finalContextJson: JSON.stringify(finalContext),
      });

      qaSessionRepository.createTurn({
        aiSessionId: sessionId,
        role: "assistant",
        content: groundedAnswer.answer,
        citationsJson: JSON.stringify(citations),
        retrievalLogId: retrievalLog.id,
      });

      return {
        retrievalLog,
      };
    })();

    return {
      answer: groundedAnswer.answer,
      citations,
      relatedQuestions: retrieval.relatedQuestions,
      retrievalLogId: savedResult.retrievalLog.id,
      strategy: input.strategy,
    };
  },
};

export type QaSessionDetail = NonNullable<
  ReturnType<typeof qaSessionService.getSessionDetail>
>;

export type QaWorkspaceOverview = ReturnType<typeof qaSessionService.getWorkspaceOverview>;

export type RecentQaSession = ReturnType<typeof qaSessionService.listRecentSessions>[number];
