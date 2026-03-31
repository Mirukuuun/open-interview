import { NextResponse } from "next/server";

import {
  submitAssessmentSessionRequestSchema,
  submitAssessmentSessionResponseDataSchema,
} from "@/lib/schemas/practice";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { practiceService } from "@/server/services/practice-service";

type SubmitPracticeExamRouteProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: SubmitPracticeExamRouteProps,
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

  const parseResult = submitAssessmentSessionRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid practice exam submission payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = await practiceService.submitExamSession(
      sessionId,
      parseResult.data,
    );
    const responseData = submitAssessmentSessionResponseDataSchema.parse(result);

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to submit practice exam.");
  }
}
