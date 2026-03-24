import { NextResponse } from "next/server";

import {
  listInterviewsQuerySchema,
  listInterviewsResponseDataSchema,
} from "@/lib/schemas/interviews";
import { apiError, apiOk } from "@/server/api/envelope";
import { interviewBrowseService } from "@/server/services/interview-browse-service";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryResult = listInterviewsQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    company: searchParams.get("company") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    page_size: searchParams.get("page_size") ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid interview query parameters.", {
        issues: queryResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = interviewBrowseService.listInterviews({
      query: queryResult.data.q,
      company: queryResult.data.company,
      tag: queryResult.data.tag,
      page: queryResult.data.page,
      pageSize: queryResult.data.page_size,
    });
    const responseData = listInterviewsResponseDataSchema.parse({
      items: result.items.map((item) => ({
        id: item.id,
        source_document_id: item.sourceDocumentId,
        source_title: item.sourceTitle,
        company: item.company,
        role: item.role,
        round_info: item.roundInfo,
        summary: item.summary,
        question_count: item.questionCount,
        tags: item.tags,
        updated_at: item.updatedAt,
      })),
      page: result.page,
      page_size: result.pageSize,
      total: result.total,
    });

    return NextResponse.json(apiOk(responseData));
  } catch {
    return NextResponse.json(
      apiError("internal_error", "Failed to list interviews."),
      { status: 500 },
    );
  }
}
