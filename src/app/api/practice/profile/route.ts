import { NextResponse } from "next/server";

import { getPracticeProfileResponseDataSchema } from "@/lib/schemas/practice";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { practiceService } from "@/server/services/practice-service";

export async function GET() {
  try {
    const result = practiceService.getPracticeProfile();
    const responseData = getPracticeProfileResponseDataSchema.parse(result);

    return NextResponse.json(apiOk(responseData));
  } catch (error) {
    if (error instanceof Error && error.name === "PracticeServiceError") {
      return toServiceErrorResponse(error, "Failed to load practice profile.");
    }

    return NextResponse.json(
      apiError("internal_error", "Failed to load practice profile."),
      { status: 500 },
    );
  }
}
