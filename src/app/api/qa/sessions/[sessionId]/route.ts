import { NextResponse } from "next/server";

import {
  deleteQaSessionResponseDataSchema,
  getQaSessionResponseDataSchema,
} from "@/lib/schemas/qa";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { qaSessionService } from "@/server/services/qa-session-service";

type QaSessionRouteProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, { params }: QaSessionRouteProps) {
  const { sessionId } = await params;
  const detail = qaSessionService.getSessionDetail(sessionId);

  if (!detail) {
    return NextResponse.json(
      apiError("not_found", "QA session was not found."),
      { status: 404 },
    );
  }

  const responseData = getQaSessionResponseDataSchema.parse({
    ai_session: detail.aiSession,
    turns: detail.turns,
  });

  return NextResponse.json(apiOk(responseData));
}

export async function DELETE(_request: Request, { params }: QaSessionRouteProps) {
  const { sessionId } = await params;

  try {
    const session = qaSessionService.archiveSession(sessionId);
    const responseData = deleteQaSessionResponseDataSchema.parse({
      ai_session: session,
    });

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to archive QA session.");
  }
}
