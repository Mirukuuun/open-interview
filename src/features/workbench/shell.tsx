import { AppSidebar } from "@/features/workbench/app-sidebar";
import { TopBar } from "@/features/workbench/top-bar";
import { getLlmProviderHealth } from "@/server/health/llm-provider";
import { workspaceSummaryService } from "@/server/services/workspace-summary-service";

export async function WorkbenchShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [summary, llmProvider] = await Promise.all([
    Promise.resolve(workspaceSummaryService.getSummary()),
    getLlmProviderHealth(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-background)] lg:flex-row">
      <AppSidebar summary={summary} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar llmProvider={llmProvider} />
        <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-4 px-4 py-4 sm:px-5">
          {children}
        </main>
      </div>
    </div>
  );
}
