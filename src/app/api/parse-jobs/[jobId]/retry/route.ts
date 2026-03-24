import { NextResponse } from "next/server";

import { createParseJobResponseDataSchema } from "@/lib/schemas/parse-jobs";
import { apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { parseReviewService } from "@/server/services/parse-review-service";

type RetryParseJobRouteProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function POST(_: Request, { params }: RetryParseJobRouteProps) {
  const { jobId } = await params;

  try {
    const parseJob = await parseReviewService.retryParseJob(jobId);
    const responseData = createParseJobResponseDataSchema.parse({
      parse_job: parseJob,
    });

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to retry parse job.");
  }
}
