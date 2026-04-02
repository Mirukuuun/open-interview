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
        <main className="mx-auto flex min-h-[calc(100vh-81px)] w-full max-w-[1600px] flex-col gap-6 px-5 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
