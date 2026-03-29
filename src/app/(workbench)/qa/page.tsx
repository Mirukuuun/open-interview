import { QaWorkbenchShell } from "@/features/qa/qa-workbench-shell";
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
    <QaWorkbenchShell
      initialQuery={initialQuery}
      recentSessions={qaSessionService.listRecentSessions(12)}
    />
  );
}
