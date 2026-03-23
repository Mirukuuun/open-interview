import { ReviewJobPlaceholder } from "@/features/review/review-job-placeholder";

type ReviewJobPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export default async function ReviewJobPage({ params }: ReviewJobPageProps) {
  const { jobId } = await params;

  return <ReviewJobPlaceholder jobId={jobId} />;
}
