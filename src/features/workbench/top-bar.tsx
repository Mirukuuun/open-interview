import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border-strong bg-background/95 px-5 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
          Open Interview
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-text-strong">
            Workbench shell
          </h2>
          <Badge tone="success">local-first</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:w-[540px] lg:flex-row lg:items-center">
        <div className="flex-1">
          <Input
            aria-label="Global search"
            placeholder="Global search placeholder for questions, interviews, and sessions"
            readOnly
          />
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-border-strong bg-white px-3 py-2 text-xs text-text-muted">
          <span className="h-2 w-2 rounded-full bg-warning" />
          Provider not connected
        </div>
      </div>
    </header>
  );
}
