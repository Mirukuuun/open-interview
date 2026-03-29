import { NextResponse } from "next/server";

import {
  askQaSessionRequestSchema,
  askQaSessionResponseDataSchema,
} from "@/lib/schemas/qa";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { qaSessionService } from "@/server/services/qa-session-service";

type AskQaSessionRouteProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: AskQaSessionRouteProps,
) {
  const { sessionId } = await params;
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      apiError("invalid_request", "Request body must be valid JSON."),
      { status: 400 },
    );
  }

  const parseResult = askQaSessionRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid QA ask payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = await qaSessionService.askQuestion(sessionId, parseResult.data);
    const responseData = askQaSessionResponseDataSchema.parse({
      answer: result.answer,
      answer_mode: result.answerMode,
      support_summary: result.supportSummary,
      citations: result.citations,
      related_questions: result.relatedQuestions.map((question) => ({
        id: question.id,
        question_text: question.questionText,
        category: question.category,
        source_count: question.sourceCount,
        tags: question.tags,
        shared_source_count: question.sharedSourceCount,
      })),
      retrieval_log_id: result.retrievalLogId,
      retrieval_summary: result.retrievalSummary,
      rewrite_applied: result.rewriteApplied,
      strategy: result.strategy,
    });

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to answer QA session question.");
  }
}
