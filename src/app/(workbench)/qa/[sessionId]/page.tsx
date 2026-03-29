import { notFound } from "next/navigation";

import { QaWorkbenchShell } from "@/features/qa/qa-workbench-shell";
import { qaSessionService } from "@/server/services/qa-session-service";

type QaSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function QaSessionPage({ params }: QaSessionPageProps) {
  const { sessionId } = await params;
  const detail = qaSessionService.getSessionDetail(sessionId);

  if (!detail) {
    notFound();
  }

  return (
    <QaWorkbenchShell
      activeSession={detail}
      recentSessions={qaSessionService.listRecentSessions(12)}
    />
  );
}
