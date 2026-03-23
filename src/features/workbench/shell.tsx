import { AppSidebar } from "@/features/workbench/app-sidebar";
import { TopBar } from "@/features/workbench/top-bar";

export function WorkbenchShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <TopBar />
        <main className="mx-auto flex min-h-[calc(100vh-81px)] w-full max-w-[1600px] flex-col gap-6 px-5 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
