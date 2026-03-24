import { NextResponse } from "next/server";

import {
  createManualQaRequestSchema,
  createManualQaResponseDataSchema,
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

  const parseResult = createManualQaRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid manual Q&A payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = importService.createManualQa({
      questionText: parseResult.data.question_text,
      answerText: parseResult.data.answer_text,
      category: parseResult.data.category ?? null,
      tags: parseResult.data.tags,
    });

    const responseData = createManualQaResponseDataSchema.parse({
      question_item: {
        id: result.questionItem.id,
      },
      answer_variant: {
        id: result.answerVariant.id,
      },
      source_document: {
        id: result.sourceDocument.id,
        parse_status: result.sourceDocument.parseStatus,
      },
    });

    return NextResponse.json(apiOk(responseData), { status: 201 });
  } catch {
    return NextResponse.json(
      apiError("internal_error", "Failed to create manual Q&A item."),
      { status: 500 },
    );
  }
}
