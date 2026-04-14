export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { parseReviewService } = await import(
      "@/server/services/parse-review-service"
    );
    parseReviewService.recoverStalledJobs();
  }
}
