import { NextResponse } from "next/server";

import { apiError } from "@/server/api/envelope";
import { ParseReviewServiceError } from "@/server/services/parse-review-errors";
import { ImportServiceError } from "@/server/services/import-service-error";
import { QaSessionServiceError } from "@/server/services/qa-session-service";
import { ResumeDeepDiveServiceError } from "@/server/services/resume-deep-dive-service";
import { ResumeServiceError } from "@/server/services/resume-service";
import { PracticeServiceError } from "@/server/services/practice-service";
import { InterviewQuestionServiceError } from "@/server/services/interview-question-service";

export function toServiceErrorResponse(
  error: unknown,
  fallbackMessage: string,
) {
  if (
    error instanceof ImportServiceError ||
    error instanceof ParseReviewServiceError ||
    error instanceof QaSessionServiceError ||
    error instanceof PracticeServiceError ||
    error instanceof InterviewQuestionServiceError ||
    error instanceof ResumeServiceError ||
    error instanceof ResumeDeepDiveServiceError
  ) {
    return NextResponse.json(
      apiError(error.code, error.message, error.details),
      { status: error.statusCode },
    );
  }

  return NextResponse.json(
    apiError("internal_error", fallbackMessage),
    { status: 500 },
  );
}
