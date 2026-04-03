import { AppSidebar } from "@/features/workbench/app-sidebar";
import { TopBar } from "@/features/workbench/top-bar";
import { workspaceSummaryService } from "@/server/services/workspace-summary-service";

export function WorkbenchShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const summary = workspaceSummaryService.getSummary();

  return (
    <div className="min-h-screen bg-background lg:flex">
      <AppSidebar summary={summary} />
      <div className="min-w-0 flex-1">
        <TopBar />
        <main className="mx-auto flex min-h-[calc(100vh-77px)] w-full max-w-[1680px] flex-col gap-5 px-4 py-5 sm:px-5 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
