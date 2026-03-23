import { ResumeDetailPlaceholder } from "@/features/resume/resume-detail-placeholder";

type ResumeDetailPageProps = {
  params: Promise<{
    resumeId: string;
  }>;
};

export default async function ResumeDetailPage({
  params,
}: ResumeDetailPageProps) {
  const { resumeId } = await params;

  return <ResumeDetailPlaceholder resumeId={resumeId} />;
}
