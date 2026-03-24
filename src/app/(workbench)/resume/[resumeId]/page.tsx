import { notFound } from "next/navigation";

import { ResumeDetailWorkbench } from "@/features/resume/resume-detail-workbench";
import { resumeService } from "@/server/services/resume-service";

type ResumeDetailPageProps = {
  params: Promise<{
    resumeId: string;
  }>;
};

export default async function ResumeDetailPage({
  params,
}: ResumeDetailPageProps) {
  const { resumeId } = await params;
  const detail = resumeService.getResumeDetail(resumeId);

  if (!detail) {
    notFound();
  }

  return <ResumeDetailWorkbench detail={detail} />;
}
