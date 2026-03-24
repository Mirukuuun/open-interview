import { NextResponse } from "next/server";

import { getParseJobResponseDataSchema } from "@/lib/schemas/parse-jobs";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { parseReviewService } from "@/server/services/parse-review-service";

type ParseJobRouteProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_: Request, { params }: ParseJobRouteProps) {
  const { jobId } = await params;

  try {
    const parseJob = parseReviewService.getParseJobSummary(jobId);

    if (!parseJob) {
      return NextResponse.json(
        apiError("not_found", "Parse job was not found."),
        { status: 404 },
      );
    }

    const responseData = getParseJobResponseDataSchema.parse({
      parse_job: parseJob,
    });

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to load parse job.");
  }
}
