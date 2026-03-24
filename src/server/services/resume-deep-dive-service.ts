import {
  askResumeProjectSessionRequestSchema,
  resumeProjectSessionSchema,
  resumeProjectSessionTurnSchema,
} from "@/lib/schemas/resume";
import { retrievalFinalContextSchema, retrievalHitSchema } from "@/lib/schemas/retrieval";
import { openClawProjectDeepDiveAdapter } from "@/server/adapters/openclaw/generate-project-deep-dive";
import {
  qaSessionRepository,
  retrievalLogRepository,
} from "@/server/repositories";
import { questionBrowseRepository } from "@/server/repositories/question-browse-repository";
import { retrieveResumeDeepDiveContext } from "@/server/retrieval/resume-deep-dive-retrieval";
import { resumeService } from "@/server/services/resume-service";
import { parseStoredRetrievalLog } from "@/server/services/session-artifacts";
import { sqlite } from "@/server/db/client";

export class ResumeDeepDiveServiceError extends Error {
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
    this.name = "ResumeDeepDiveServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function toApiSession(
  session: NonNullable<ReturnType<typeof qaSessionRepository.findById>>,
) {
  return resumeProjectSessionSchema.parse({
    id: session.id,
    session_type: "resume_deep_dive",
    status: session.status,
    related_resume_project_id: session.relatedResumeProjectId,
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

function toProjectContext(project: NonNullable<ReturnType<typeof resumeService.getProjectDetail>>) {
  return {
    id: project.id,
    sourceDocumentId: project.source_document.id,
    name: project.name,
    summary: project.summary ?? null,
    highlights: project.highlights,
    techStack: project.tech_stack,
    deepDiveQuestions: project.deep_dive_questions,
  };
}

export const resumeDeepDiveService = {
  createSession(projectId: string, input?: { title?: string | null }) {
    const project = resumeService.getProjectDetail(projectId);

    if (!project) {
      throw new ResumeDeepDiveServiceError("not_found", "Resume project was not found.", 404);
    }

    const projectContext = toProjectContext(project);
    const session = sqlite.transaction(() => {
      const createdSession = qaSessionRepository.create({
        sessionType: "resume_deep_dive",
        relatedResumeProjectId: projectId,
        title: input?.title?.trim() || `${project.name} deep dive`,
      });

      qaSessionRepository.createTurn({
        aiSessionId: createdSession.id,
        role: "assistant",
        content: openClawProjectDeepDiveAdapter.start({
          project: {
            name: projectContext.name,
            summary: projectContext.summary,
            highlights: projectContext.highlights,
            techStack: projectContext.techStack,
            deepDiveQuestions: projectContext.deepDiveQuestions,
          },
        }),
      });

      return createdSession;
    })();

    return toApiSession(session);
  },

  getSessionDetail(projectId: string, sessionId: string) {
    const project = resumeService.getProjectDetail(projectId);

    if (!project) {
      return undefined;
    }

    const session = qaSessionRepository.findById(sessionId);

    if (
      !session ||
      session.sessionType !== "resume_deep_dive" ||
      session.relatedResumeProjectId !== projectId
    ) {
      return undefined;
    }

    const turns = qaSessionRepository.listTurns(sessionId);
    const askedQuestions: string[] = [];
    const projectContext = toProjectContext(project);

    return {
      resumeProject: project,
      aiSession: toApiSession(session),
      turns: turns.map((turn, index) => {
        const retrievalLog = turn.retrievalLogId
          ? parseStoredRetrievalLog(retrievalLogRepository.findById(turn.retrievalLogId))
          : null;
        const relatedQuestions = retrievalLog
          ? resolveRelatedQuestions(retrievalLog.final_context.related_question_ids)
          : [];
        const previousTurn = index > 0 ? turns[index - 1] : null;
        const coachHints =
          turn.role === "assistant" && previousTurn?.role === "user"
            ? openClawProjectDeepDiveAdapter.continue({
                project: {
                  name: projectContext.name,
                  summary: projectContext.summary,
                  highlights: projectContext.highlights,
                  techStack: projectContext.techStack,
                  deepDiveQuestions: projectContext.deepDiveQuestions,
                },
                askedQuestions,
                latestAnswer: previousTurn.content,
                relatedQuestions: relatedQuestions.map((question) => ({
                  id: question.id,
                  questionText: question.question_text,
                })),
              }).coachHints
            : [];

        if (turn.role === "assistant") {
          askedQuestions.push(turn.content);
        }

        return resumeProjectSessionTurnSchema.parse({
          id: turn.id,
          role: turn.role,
          content: turn.content,
          coach_hints: coachHints,
          related_questions: relatedQuestions,
          retrieval_log_id: turn.retrievalLogId,
          retrieval_log: retrievalLog,
          created_at: turn.createdAt,
        });
      }),
    };
  },

  askQuestion(sessionId: string, input: { answer: string }) {
    const payload = askResumeProjectSessionRequestSchema.parse(input);
    const session = qaSessionRepository.findById(sessionId);

    if (
      !session ||
      session.sessionType !== "resume_deep_dive" ||
      !session.relatedResumeProjectId
    ) {
      throw new ResumeDeepDiveServiceError(
        "not_found",
        "Project deep-dive session was not found.",
        404,
      );
    }

    if (session.status !== "active") {
      throw new ResumeDeepDiveServiceError(
        "conflict",
        "Only active deep-dive sessions can accept new answers.",
        409,
      );
    }

    const project = resumeService.getProjectDetail(session.relatedResumeProjectId);

    if (!project) {
      throw new ResumeDeepDiveServiceError(
        "not_found",
        "Related resume project was not found.",
        404,
      );
    }

    const projectContext = toProjectContext(project);
    const existingTurns = qaSessionRepository.listTurns(sessionId);
    const askedQuestions = existingTurns
      .filter((turn) => turn.role === "assistant")
      .map((turn) => turn.content);
    const retrieval = retrieveResumeDeepDiveContext({
      answer: payload.answer,
      project: projectContext,
    });
    const hits = retrievalHitSchema.array().parse(retrieval.hits);
    const finalContext = retrievalFinalContextSchema.parse(retrieval.finalContext);
    const response = openClawProjectDeepDiveAdapter.continue({
      project: {
        name: projectContext.name,
        summary: projectContext.summary,
        highlights: projectContext.highlights,
        techStack: projectContext.techStack,
        deepDiveQuestions: projectContext.deepDiveQuestions,
      },
      askedQuestions,
      latestAnswer: payload.answer,
      relatedQuestions: retrieval.relatedQuestions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
      })),
    });

    const savedResult = sqlite.transaction(() => {
      qaSessionRepository.createTurn({
        aiSessionId: sessionId,
        role: "user",
        content: payload.answer,
      });

      const retrievalLog = retrievalLogRepository.create({
        queryText: payload.answer,
        queryType: "resume_deep_dive",
        strategy: "hybrid",
        hitsJson: JSON.stringify(hits),
        finalContextJson: JSON.stringify(finalContext),
      });

      qaSessionRepository.createTurn({
        aiSessionId: sessionId,
        role: "assistant",
        content: response.nextQuestion,
        retrievalLogId: retrievalLog.id,
      });

      return retrievalLog;
    })();

    return {
      nextQuestion: response.nextQuestion,
      coachHints: response.coachHints,
      retrievalLogId: savedResult.id,
    };
  },
};

export type ResumeDeepDiveSessionDetail = NonNullable<
  ReturnType<typeof resumeDeepDiveService.getSessionDetail>
>;
