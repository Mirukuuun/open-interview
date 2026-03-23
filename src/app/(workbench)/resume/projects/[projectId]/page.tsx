import { ProjectPlaceholder } from "@/features/resume/project-placeholder";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  return <ProjectPlaceholder projectId={projectId} />;
}
