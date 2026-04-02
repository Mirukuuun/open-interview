import { redirect } from "next/navigation";

import { workspaceSummaryService } from "@/server/services/workspace-summary-service";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const summary = workspaceSummaryService.getSummary();

  redirect(summary.activeQuestionCount > 0 ? "/questions" : "/import");
}
