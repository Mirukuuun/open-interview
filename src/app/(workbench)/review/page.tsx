import { ReviewQueueWorkbench } from "@/features/review/review-queue-workbench";
import { parseReviewService } from "@/server/services/parse-review-service";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  const reviewQueue = parseReviewService.listReviewQueue({
    page: 1,
    pageSize: 100,
  });

  return <ReviewQueueWorkbench initialData={reviewQueue} />;
}
