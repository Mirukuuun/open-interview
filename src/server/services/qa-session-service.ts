import type {
  AskQaSessionRequest,
  QaAnswerMode,
  QaCitation,
} from "@/lib/schemas/qa";
import {
  qaAnswerModeSchema,
  qaCitationSchema,
  qaSessionSchema,
  qaSessionTurnSchema,
} from "@/lib/schemas/qa";
import {
  retrievalFinalContextSchema,
  retrievalHitSchema,
} from "@/lib/schemas/retrieval";
import { sqlite } from "@/server/db/client";
import { questionBrowseRepository } from "@/server/repositories/question-browse-repository";
import {
  chunkRepository,
  qaSessionRepository,
  questionRepository,
  retrievalLogRepository,
} from "@/server/repositories";
import { retrieveHybridQaContext } from "@/server/retrieval/hybrid-qa-retrieval";
import { answerGroundedQa } from "@/server/retrieval/qa-grounded-answer-chain";
import { rewriteQaQuery } from "@/server/retrieval/qa-rewrite-chain";
import {
  buildSessionTitle as buildStoredSessionTitle,
  parseJsonArray,
  parseStoredRetrievalLog,
} from "@/server/services/session-artifacts";
import { qaMilvusFoundationService } from "@/server/vector/qa-milvus-foundation";

/**
 * [POS] 编排 QA session 的 rewrite、hybrid retrieval、grounded answer 与 assistant turn 持久化。
 * [IN] QA session id、用户 query、top_k / strategy 等 API 边界输入。
 * [OUT] 返回 grounded answer、answer_mode、citations、retrieval_log，并持久化 session turns。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

import { BaseServiceError } from "@/server/api/base-service-error";

export class QaSessionServiceError extends BaseServiceError {}

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
  return buildStoredSessionTitle(title, fallbackQuery);
}

function parseAssistantAnswerMode(value: string | null | undefined): QaAnswerMode {
  const parsedValue = qaAnswerModeSchema.safeParse(value);

  return parsedValue.success ? parsedValue.data : "grounded_answered";
}

function buildSessionHistory(
  turns: ReturnType<typeof qaSessionRepository.listTurns>,
) {
  return turns
    .filter(
      (turn): turn is typeof turn & { role: "user" | "assistant" } =>
        turn.role === "user" || turn.role === "assistant",
    )
    .slice(-6)
    .map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));
}

function buildQuestionContexts(
  questions: Array<NonNullable<ReturnType<typeof questionBrowseRepository.findById>>>,
) {
  return questions.map((question) => ({
    questionText: question.questionText,
    canonicalAnswer: question.canonicalAnswer,
    personalAnswer: null,
    sourceSnippet: question.sources[0]?.sourceSnippet ?? null,
  }));
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

  archiveSession(sessionId: string) {
    const session = qaSessionRepository.findById(sessionId);

    if (!session || session.sessionType !== "qa") {
      throw new QaSessionServiceError("not_found", "QA session was not found.", 404);
    }

    if (session.status === "archived") {
      return toApiSession(session);
    }

    const archivedSession = qaSessionRepository.archive(sessionId);

    if (!archivedSession) {
      throw new QaSessionServiceError(
        "not_found",
        "QA session was not found after archive.",
        404,
      );
    }

    return toApiSession(archivedSession);
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
    const activeQuestionCount = questionRepository.countActive();
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

    if (!session || session.sessionType !== "qa" || session.status === "archived") {
      return undefined;
    }

    const turns = qaSessionRepository.listTurns(sessionId).map((turn) => {
      const citations = qaCitationSchema
        .array()
        .safeParse(parseJsonArray<QaCitation>(turn.citationsJson));
      const retrievalLog = parseStoredRetrievalLog(
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
        answer_mode:
          turn.role === "assistant" ? parseAssistantAnswerMode(turn.answerMode) : undefined,
        support_summary: turn.supportSummary,
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
    const sessionHistory = buildSessionHistory(existingTurns);
    const rewriteResult = await rewriteQaQuery({
      query,
      sessionHistory,
    });
    const foundationSnapshot = await qaMilvusFoundationService.prepare({
      runSync: input.strategy === "hybrid",
      maxChunks: input.top_k,
    });
    const retrieval = await retrieveHybridQaContext({
      query,
      effectiveQuery: rewriteResult.effectiveQuery,
      normalizedQuery: rewriteResult.normalizedQuery,
      rewrittenQuery: rewriteResult.rewrittenQuery,
      rewriteApplied: rewriteResult.rewriteApplied,
      topK: input.top_k,
      strategy: input.strategy,
      foundationSnapshot,
    });
    const groundedAnswer = await answerGroundedQa({
      query,
      effectiveQuery: rewriteResult.effectiveQuery,
      supportLevel: retrieval.answerMode,
      sessionHistory,
      citations: retrieval.citations,
      questionContexts: buildQuestionContexts(retrieval.questions),
    });
    const citations = qaCitationSchema.array().parse(retrieval.citations);
    const hits = retrievalHitSchema.array().parse(retrieval.hits);
    const finalContext = retrievalFinalContextSchema.parse({
      ...retrieval.finalContext,
      support_level: groundedAnswer.answerMode,
      support_summary: groundedAnswer.supportSummary,
      retrieval_summary: retrieval.retrievalSummary,
    });

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
        answerMode: groundedAnswer.answerMode,
        supportSummary: groundedAnswer.supportSummary,
        retrievalLogId: retrievalLog.id,
      });

      return {
        retrievalLog,
      };
    })();

    return {
      answer: groundedAnswer.answer,
      answerMode: groundedAnswer.answerMode,
      supportSummary: groundedAnswer.supportSummary,
      citations,
      relatedQuestions: retrieval.relatedQuestions,
      retrievalLogId: savedResult.retrievalLog.id,
      retrievalSummary: {
        text: retrieval.retrievalSummary,
        rewrite_applied: rewriteResult.rewriteApplied,
        support_level: groundedAnswer.answerMode,
        lexical_hits: finalContext.channel_counts?.lexical_hits ?? 0,
        vector_hits: finalContext.channel_counts?.vector_hits ?? 0,
        merged_hits: finalContext.channel_counts?.merged_hits ?? 0,
      },
      rewriteApplied: rewriteResult.rewriteApplied,
      strategy: input.strategy,
    };
  },
};

export type QaSessionDetail = NonNullable<
  ReturnType<typeof qaSessionService.getSessionDetail>
>;

export type QaWorkspaceOverview = ReturnType<typeof qaSessionService.getWorkspaceOverview>;

export type RecentQaSession = ReturnType<typeof qaSessionService.listRecentSessions>[number];
