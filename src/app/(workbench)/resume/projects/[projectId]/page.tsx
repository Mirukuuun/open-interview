import { notFound } from "next/navigation";

import { ProjectWorkbench } from "@/features/resume/project-workbench";
import { resumeService } from "@/server/services/resume-service";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = resumeService.getProjectDetail(projectId);

  if (!project) {
    notFound();
  }

  return <ProjectWorkbench project={project} />;
}
