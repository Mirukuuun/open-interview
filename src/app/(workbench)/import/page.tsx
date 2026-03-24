import { ImportWorkbench } from "@/features/import/import-workbench";
import { importService } from "@/server/services/import-service";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const recentSourcesResult = importService.listSources({
    page: 1,
    pageSize: 8,
  });
  const manualQaOptions = importService.getManualQaOptions();

  return (
    <ImportWorkbench
      manualQaOptions={manualQaOptions}
      recentSources={recentSourcesResult.items}
      totalSources={recentSourcesResult.total}
    />
  );
}
