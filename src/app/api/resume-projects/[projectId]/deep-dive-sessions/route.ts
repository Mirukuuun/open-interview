import { NextResponse } from "next/server";

import {
  createResumeProjectSessionRequestSchema,
  createResumeProjectSessionResponseDataSchema,
} from "@/lib/schemas/resume";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { resumeDeepDiveService } from "@/server/services/resume-deep-dive-service";

type CreateResumeProjectSessionRouteProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: CreateResumeProjectSessionRouteProps,
) {
  const { projectId } = await params;
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      apiError("invalid_request", "Request body must be valid JSON."),
      { status: 400 },
    );
  }

  const parseResult = createResumeProjectSessionRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid deep-dive session payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const session = resumeDeepDiveService.createSession(projectId, {
      title: parseResult.data.title ?? null,
    });
    const responseData = createResumeProjectSessionResponseDataSchema.parse({
      ai_session: session,
    });

    return NextResponse.json(apiOk(responseData), { status: 201 });
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to create project deep-dive session.");
  }
}
