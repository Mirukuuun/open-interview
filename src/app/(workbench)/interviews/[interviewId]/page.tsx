import { InterviewDetailPlaceholder } from "@/features/interviews/interview-detail-placeholder";

type InterviewDetailPageProps = {
  params: Promise<{
    interviewId: string;
  }>;
};

export default async function InterviewDetailPage({
  params,
}: InterviewDetailPageProps) {
  const { interviewId } = await params;

  return <InterviewDetailPlaceholder interviewId={interviewId} />;
}
