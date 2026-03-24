import { NextResponse } from "next/server";

import { getResumeProjectResponseDataSchema } from "@/lib/schemas/resume";
import { apiError, apiOk } from "@/server/api/envelope";
import { resumeService } from "@/server/services/resume-service";

type ResumeProjectRouteProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, { params }: ResumeProjectRouteProps) {
  const { projectId } = await params;
  const project = resumeService.getProjectDetail(projectId);

  if (!project) {
    return NextResponse.json(
      apiError("not_found", "Resume project was not found."),
      { status: 404 },
    );
  }

  const responseData = getResumeProjectResponseDataSchema.parse({
    resume_project: project,
  });

  return NextResponse.json(apiOk(responseData));
}
