import { NextResponse } from "next/server";

import {
  listSourcesQuerySchema,
  listSourcesResponseDataSchema,
} from "@/lib/schemas/import";
import { apiError, apiOk } from "@/server/api/envelope";
import { importService } from "@/server/services/import-service";

function toSourceListItem(sourceDocument: {
  id: string;
  kind: "interview_experience" | "knowledge_note" | "resume" | "manual_input";
  title: string;
  fileName: string | null;
  mimeType: string | null;
  filePath: string | null;
  sourceUrl: string | null;
  parseStatus:
    | "not_started"
    | "pending"
    | "running"
    | "needs_review"
    | "confirmed"
    | "failed";
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: sourceDocument.id,
    kind: sourceDocument.kind,
    title: sourceDocument.title,
    file_name: sourceDocument.fileName,
    mime_type: sourceDocument.mimeType,
    file_path: sourceDocument.filePath,
    source_url: sourceDocument.sourceUrl,
    parse_status: sourceDocument.parseStatus,
    created_at: sourceDocument.createdAt,
    updated_at: sourceDocument.updatedAt,
  };
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryResult = listSourcesQuerySchema.safeParse({
    kind: searchParams.get("kind") ?? undefined,
    parse_status: searchParams.get("parse_status") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    page_size: searchParams.get("page_size") ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid source query parameters.", {
        issues: queryResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = importService.listSources({
      kind: queryResult.data.kind,
      parseStatus: queryResult.data.parse_status,
      query: queryResult.data.q,
      page: queryResult.data.page,
      pageSize: queryResult.data.page_size,
    });

    const responseData = listSourcesResponseDataSchema.parse({
      items: result.items.map(toSourceListItem),
      page: result.page,
      page_size: result.pageSize,
      total: result.total,
    });

    return NextResponse.json(apiOk(responseData));
  } catch {
    return NextResponse.json(
      apiError("internal_error", "Failed to list imported sources."),
      { status: 500 },
    );
  }
}
