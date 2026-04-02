import { WorkbenchShell } from "@/features/workbench/shell";

export const dynamic = "force-dynamic";

export default function WorkbenchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WorkbenchShell>{children}</WorkbenchShell>;
}
