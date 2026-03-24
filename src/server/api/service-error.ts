import { NextResponse } from "next/server";

import { apiError } from "@/server/api/envelope";
import { ParseReviewServiceError } from "@/server/services/parse-review-service";

export function toServiceErrorResponse(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof ParseReviewServiceError) {
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
