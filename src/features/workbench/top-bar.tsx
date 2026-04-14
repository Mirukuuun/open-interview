import { Badge } from "@/components/ui/badge";
import type { LlmProviderHealth } from "@/lib/schemas/health";
import { cn } from "@/lib/utils";

type TopBarProps = {
  llmProvider: LlmProviderHealth;
};

function getLlmProviderTone(status: LlmProviderHealth["status"]) {
  if (status === "connected") {
    return {
      containerClassName: "border border-transparent bg-success-soft text-success",
      dotClassName: "bg-[color:var(--success)]",
    };
  }

  if (status === "not_configured") {
    return {
      containerClassName: "border border-border-muted bg-surface-muted text-text-muted",
      dotClassName: "bg-[color:var(--border-strong)]",
    };
  }

  return {
    containerClassName: "border border-amber-200 bg-amber-50 text-warning",
    dotClassName: "bg-[color:var(--warning)]",
  };
}

export function TopBar({ llmProvider }: TopBarProps) {
  const tone = getLlmProviderTone(llmProvider.status);

  return (
    <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border-strong bg-background/90 px-4 py-3.5 backdrop-blur sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
          Open Interview
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold tracking-[-0.03em] text-text-strong">
            工作台
          </h2>
          <Badge tone="success">本地优先</Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex min-h-10 items-center gap-2 self-start rounded-full px-3 py-2 text-xs",
            tone.containerClassName,
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", tone.dotClassName)} />
          {llmProvider.message}
        </div>
      </div>
    </header>
  );
}
