import { NextResponse } from "next/server";

import {
  createResumeFromSourceRequestSchema,
  createResumeFromSourceResponseDataSchema,
} from "@/lib/schemas/resume";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { resumeService } from "@/server/services/resume-service";

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

  const parseResult = createResumeFromSourceRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid resume import payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = resumeService.createFromSource(parseResult.data.source_document_id);
    const responseData = createResumeFromSourceResponseDataSchema.parse({
      resume_document: result.resumeDocument,
      projects: result.projects,
    });

    return NextResponse.json(apiOk(responseData), { status: 201 });
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to create structured resume entities.");
  }
}
