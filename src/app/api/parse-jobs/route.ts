import { NextResponse } from "next/server";

import {
  createParseJobRequestSchema,
  createParseJobResponseDataSchema,
  listParseJobsQuerySchema,
  listParseJobsResponseDataSchema,
} from "@/lib/schemas/parse-jobs";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { parseReviewService } from "@/server/services/parse-review-service";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryResult = listParseJobsQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    kind: searchParams.get("kind") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    page_size: searchParams.get("page_size") ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid parse job query parameters.", {
        issues: queryResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const queue = parseReviewService.listReviewQueue({
      status: queryResult.data.status,
      kind: queryResult.data.kind,
      query: queryResult.data.q,
      page: queryResult.data.page,
      pageSize: queryResult.data.page_size,
    });
    const responseData = listParseJobsResponseDataSchema.parse({
      items: queue.items,
      page: queue.page,
      page_size: queue.pageSize,
      total: queue.total,
      status_summary: queue.statusSummary,
    });

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to list parse jobs.");
  }
}

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

  const parseResult = createParseJobRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid parse job payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const parseJob = await parseReviewService.createParseJob({
      sourceDocumentId: parseResult.data.source_document_id,
      jobType: parseResult.data.job_type,
    });
    const responseData = createParseJobResponseDataSchema.parse({
      parse_job: parseJob,
    });

    return NextResponse.json(apiOk(responseData), { status: 201 });
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to create parse job.");
  }
}
