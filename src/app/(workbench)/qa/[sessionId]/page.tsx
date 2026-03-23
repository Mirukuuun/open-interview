import { QaSessionPlaceholder } from "@/features/qa/qa-session-placeholder";

type QaSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function QaSessionPage({ params }: QaSessionPageProps) {
  const { sessionId } = await params;

  return <QaSessionPlaceholder sessionId={sessionId} />;
}
