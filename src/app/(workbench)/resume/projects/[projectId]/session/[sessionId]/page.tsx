import { ProjectSessionPlaceholder } from "@/features/resume/project-session-placeholder";

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

  return (
    <ProjectSessionPlaceholder projectId={projectId} sessionId={sessionId} />
  );
}
