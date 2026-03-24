import { NextResponse } from "next/server";

import {
  createTextSourceRequestSchema,
  createTextSourceResponseDataSchema,
} from "@/lib/schemas/import";
import { apiError, apiOk } from "@/server/api/envelope";
import { importService } from "@/server/services/import-service";

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

  const parseResult = createTextSourceRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid text source payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const sourceDocument = importService.createTextSource({
      title: parseResult.data.title,
      kind: parseResult.data.kind,
      rawText: parseResult.data.raw_text,
      sourceUrl: parseResult.data.source_url ?? null,
    });

    const responseData = createTextSourceResponseDataSchema.parse({
      source_document: {
        id: sourceDocument.id,
        parse_status: sourceDocument.parseStatus,
      },
    });

    return NextResponse.json(apiOk(responseData), { status: 201 });
  } catch {
    return NextResponse.json(
      apiError("internal_error", "Failed to create text source."),
      { status: 500 },
    );
  }
}
