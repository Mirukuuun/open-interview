import { notFound } from "next/navigation";

import { ProjectSessionWorkbench } from "@/features/resume/project-session-workbench";
import { resumeDeepDiveService } from "@/server/services/resume-deep-dive-service";

type ProjectSessionPageProps = {
  params: Promise<{
    projectId: string;
    sessionId: string;
  }>;
};

export default async function ProjectSessionPage({
  params,
}: ProjectSessionPageProps) {
  const { projectId, sessionId } = await params;
  const detail = resumeDeepDiveService.getSessionDetail(projectId, sessionId);

  if (!detail) {
    notFound();
  }

  return <ProjectSessionWorkbench detail={detail} />;
}
