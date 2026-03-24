import { NextResponse } from "next/server";

import {
  confirmParseJobRequestSchema,
  confirmParseJobResponseDataSchema,
} from "@/lib/schemas/parse-jobs";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { parseReviewService } from "@/server/services/parse-review-service";

type ConfirmParseJobRouteProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function POST(request: Request, { params }: ConfirmParseJobRouteProps) {
  const { jobId } = await params;
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      apiError("invalid_request", "Request body must be valid JSON."),
      { status: 400 },
    );
  }

  const parseResult = confirmParseJobRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid parse job confirmation payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = parseReviewService.confirmParseJob(jobId, parseResult.data);
    const responseData = confirmParseJobResponseDataSchema.parse({
      parse_job: result.parseJob,
      import_summary: {
        created_questions: result.importSummary.createdQuestions,
        merged_questions: result.importSummary.mergedQuestions,
        skipped_questions: result.importSummary.skippedQuestions,
        created_interview_experience_id:
          result.importSummary.createdInterviewExperienceId,
      },
    });

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to confirm parse job.");
  }
}
