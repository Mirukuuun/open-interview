import { NextResponse } from "next/server";

import {
  listQuestionsQuerySchema,
  listQuestionsResponseDataSchema,
} from "@/lib/schemas/questions";
import { apiError, apiOk } from "@/server/api/envelope";
import { questionBankService } from "@/server/services/question-bank-service";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryResult = listQuestionsQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    difficulty: searchParams.get("difficulty") ?? undefined,
    has_personal_answer: searchParams.get("has_personal_answer") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    page_size: searchParams.get("page_size") ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid question query parameters.", {
        issues: queryResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = questionBankService.listQuestions({
      query: queryResult.data.q,
      category: queryResult.data.category,
      tag: queryResult.data.tag,
      difficulty: queryResult.data.difficulty,
      hasPersonalAnswer: queryResult.data.has_personal_answer,
      sort: queryResult.data.sort,
      page: queryResult.data.page,
      pageSize: queryResult.data.page_size,
    });
    const responseData = listQuestionsResponseDataSchema.parse({
      items: result.items.map((item) => ({
        id: item.id,
        question_text: item.questionText,
        category: item.category,
        difficulty: item.difficulty,
        source_count: item.sourceCount,
        updated_at: item.updatedAt,
        tags: item.tags,
        has_personal_answer: item.hasPersonalAnswer,
      })),
      page: result.page,
      page_size: result.pageSize,
      total: result.total,
    });

    return NextResponse.json(apiOk(responseData));
  } catch {
    return NextResponse.json(
      apiError("internal_error", "Failed to list questions."),
      { status: 500 },
    );
  }
}
