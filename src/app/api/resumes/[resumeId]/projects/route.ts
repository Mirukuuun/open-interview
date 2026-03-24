import { NextResponse } from "next/server";

import { apiError, apiOk } from "@/server/api/envelope";
import { getResumeProjectsResponseDataSchema } from "@/lib/schemas/resume";
import { resumeService } from "@/server/services/resume-service";

type ResumeProjectsRouteProps = {
  params: Promise<{
    resumeId: string;
  }>;
};

export async function GET(_request: Request, { params }: ResumeProjectsRouteProps) {
  const { resumeId } = await params;
  const detail = resumeService.getResumeDetail(resumeId);

  if (!detail) {
    return NextResponse.json(
      apiError("not_found", "Resume document was not found."),
      { status: 404 },
    );
  }

  const responseData = getResumeProjectsResponseDataSchema.parse({
    resume_document: detail.resumeDocument,
    items: detail.projects,
  });

  return NextResponse.json(apiOk(responseData));
}
