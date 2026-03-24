import { NextResponse } from "next/server";

import {
  createQaSessionRequestSchema,
  createQaSessionResponseDataSchema,
} from "@/lib/schemas/qa";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { qaSessionService } from "@/server/services/qa-session-service";

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      apiError("invalid_request", "Request body must be valid JSON."),
      { status: 400 },
    );
  }

  const parseResult = createQaSessionRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid QA session payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const session = qaSessionService.createSession({
      title: parseResult.data.title ?? null,
    });
    const responseData = createQaSessionResponseDataSchema.parse({
      ai_session: session,
    });

    return NextResponse.json(apiOk(responseData), { status: 201 });
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to create QA session.");
  }
}
