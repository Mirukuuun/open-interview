import { notFound } from "next/navigation";

import { InterviewDetailWorkbench } from "@/features/interviews/interview-detail-workbench";
import { interviewBrowseService } from "@/server/services/interview-browse-service";

type InterviewDetailPageProps = {
  params: Promise<{
    interviewId: string;
  }>;
};

export default async function InterviewDetailPage({
  params,
}: InterviewDetailPageProps) {
  const { interviewId } = await params;
  const interview = interviewBrowseService.getInterviewDetail(interviewId);

  if (!interview) {
    notFound();
  }

  return <InterviewDetailWorkbench interview={interview} />;
}
