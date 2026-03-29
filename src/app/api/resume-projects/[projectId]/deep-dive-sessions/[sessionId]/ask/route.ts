import { NextResponse } from "next/server";

import {
  askResumeProjectSessionRequestSchema,
  askResumeProjectSessionResponseDataSchema,
} from "@/lib/schemas/resume";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { resumeDeepDiveService } from "@/server/services/resume-deep-dive-service";

type AskResumeProjectSessionRouteProps = {
  params: Promise<{
    projectId: string;
    sessionId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: AskResumeProjectSessionRouteProps,
) {
  const { projectId, sessionId } = await params;
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      apiError("invalid_request", "Request body must be valid JSON."),
      { status: 400 },
    );
  }

  const parseResult = askResumeProjectSessionRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid deep-dive answer payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const detail = resumeDeepDiveService.getSessionDetail(projectId, sessionId);

    if (!detail) {
      return NextResponse.json(
        apiError("not_found", "Project deep-dive session was not found."),
        { status: 404 },
      );
    }

    const result = await resumeDeepDiveService.askQuestion(sessionId, {
      answer: parseResult.data.answer,
    });
    const responseData = askResumeProjectSessionResponseDataSchema.parse({
      next_question: result.nextQuestion,
      coach_hints: result.coachHints,
      retrieval_log_id: result.retrievalLogId,
    });

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to continue project deep-dive session.");
  }
}
