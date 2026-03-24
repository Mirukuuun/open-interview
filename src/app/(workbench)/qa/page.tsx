import { QaWorkbench } from "@/features/qa/qa-workbench";
import { qaSessionService } from "@/server/services/qa-session-service";

type QaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QaPage({ searchParams }: QaPageProps) {
  const rawSearchParams = await searchParams;
  const initialQuery = getSearchParamValue(rawSearchParams.q) ?? "";

  return (
    <QaWorkbench
      initialQuery={initialQuery}
      overview={qaSessionService.getWorkspaceOverview()}
      recentSessions={qaSessionService.listRecentSessions()}
    />
  );
}
