import { NextResponse } from "next/server";

import {
  interviewQuestionPromoteRequestSchema,
  interviewQuestionPromoteResponseDataSchema,
} from "@/lib/schemas/interview-questions";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { interviewQuestionService } from "@/server/services/interview-question-service";

type PromoteInterviewQuestionRouteProps = {
  params: Promise<{
    interviewQuestionId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: PromoteInterviewQuestionRouteProps,
) {
  const { interviewQuestionId } = await params;
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      apiError("invalid_request", "Request body must be valid JSON."),
      { status: 400 },
    );
  }

  const parseResult = interviewQuestionPromoteRequestSchema.safeParse(requestBody);

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid interview question promote payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const result = interviewQuestionService.promoteInterviewQuestion(
      interviewQuestionId,
      parseResult.data,
    );
    const responseData = interviewQuestionPromoteResponseDataSchema.parse({
      promotion: {
        interview_question_id: result.interviewQuestionId,
        question_item_id: result.questionItemId,
        question_text: result.questionText,
        link_type: result.linkType,
      },
    });

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to promote interview question.");
  }
}
