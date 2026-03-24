import { notFound } from "next/navigation";

import { QaSessionWorkbench } from "@/features/qa/qa-session-workbench";
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

  return <QaSessionWorkbench detail={detail} />;
}
