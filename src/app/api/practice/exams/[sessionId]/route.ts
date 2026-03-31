import { NextResponse } from "next/server";

import { getAssessmentSessionResponseDataSchema } from "@/lib/schemas/practice";
import { apiError, apiOk } from "@/server/api/envelope";
import { practiceService } from "@/server/services/practice-service";

type PracticeExamRouteProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_: Request, { params }: PracticeExamRouteProps) {
  const { sessionId } = await params;

  try {
    const result = practiceService.getExamSessionDetail(sessionId);

    if (!result) {
      return NextResponse.json(
        apiError("not_found", "Practice exam session was not found."),
        { status: 404 },
      );
    }

    const responseData = getAssessmentSessionResponseDataSchema.parse(result);

    return NextResponse.json(apiOk(responseData));
  } catch {
    return NextResponse.json(
      apiError("internal_error", "Failed to load practice exam session."),
      { status: 500 },
    );
  }
}
