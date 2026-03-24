import { NextResponse } from "next/server";

import { apiError } from "@/server/api/envelope";
import { ParseReviewServiceError } from "@/server/services/parse-review-service";
import { QaSessionServiceError } from "@/server/services/qa-session-service";
import { ResumeDeepDiveServiceError } from "@/server/services/resume-deep-dive-service";
import { ResumeServiceError } from "@/server/services/resume-service";

export function toServiceErrorResponse(
  error: unknown,
  fallbackMessage: string,
) {
  if (
    error instanceof ParseReviewServiceError ||
    error instanceof QaSessionServiceError ||
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
