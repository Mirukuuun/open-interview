import { notFound } from "next/navigation";

import { ReviewJobWorkbench } from "@/features/review/review-job-workbench";
import { parseReviewService } from "@/server/services/parse-review-service";

export const dynamic = "force-dynamic";

type ReviewJobPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export default async function ReviewJobPage({ params }: ReviewJobPageProps) {
  const { jobId } = await params;
  const detail = parseReviewService.getReviewJobDetail(jobId);

  if (!detail) {
    notFound();
  }

  return <ReviewJobWorkbench detail={detail} />;
}
