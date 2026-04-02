import { NextResponse } from "next/server";

import {
  createAssessmentSessionRequestSchema,
  createAssessmentSessionResponseDataSchema,
} from "@/lib/schemas/practice";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { practiceService } from "@/server/services/practice-service";

export async function POST(request: Request) {
  let requestBody: unknown = {};

  try {
    requestBody = await request.json();
  } catch {
    requestBody = {};
  }

  const parseResult = createAssessmentSessionRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid practice exam payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = practiceService.createExamSession({
      questionCount: parseResult.data.question_count,
      dimension: parseResult.data.dimension,
    });
    const responseData = createAssessmentSessionResponseDataSchema.parse(result);

    return NextResponse.json(apiOk(responseData), { status: 201 });
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to create practice exam.");
  }
}
