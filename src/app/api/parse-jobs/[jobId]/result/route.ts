import { NextResponse } from "next/server";

import { getParseJobResultResponseDataSchema } from "@/lib/schemas/parse-jobs";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { parseReviewService } from "@/server/services/parse-review-service";

type ParseJobResultRouteProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_: Request, { params }: ParseJobResultRouteProps) {
  const { jobId } = await params;

  try {
    const parseJob = parseReviewService.getParseJobSummary(jobId);

    if (!parseJob) {
      return NextResponse.json(
        apiError("not_found", "Parse job was not found."),
        { status: 404 },
      );
    }

    const responseData = getParseJobResultResponseDataSchema.parse({
      result: parseReviewService.getParseJobResult(jobId),
    });

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to load parse result.");
  }
}
