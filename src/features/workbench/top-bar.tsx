import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { LlmProviderHealth } from "@/lib/schemas/health";
import { cn } from "@/lib/utils";

type TopBarProps = {
  llmProvider: LlmProviderHealth;
};

function getLlmProviderTone(status: LlmProviderHealth["status"]) {
  if (status === "connected") {
    return {
      containerClassName:
        "border border-transparent bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]",
      dotClassName: "bg-[color:var(--color-success)]",
    };
  }

  if (status === "not_configured") {
    return {
      containerClassName:
        "border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] text-[color:var(--color-muted-foreground)]",
      dotClassName: "bg-[color:var(--color-border)]",
    };
  }

  return {
    containerClassName:
      "border border-transparent bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
    dotClassName: "bg-[color:var(--color-warning)]",
  };
}

export function TopBar({ llmProvider }: TopBarProps) {
  const tone = getLlmProviderTone(llmProvider.status);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-end gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-background)]/90 px-4 py-2.5 backdrop-blur sm:px-5">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-[11px]",
          tone.containerClassName,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", tone.dotClassName)} />
        <span>{llmProvider.message}</span>
      </div>
      <ThemeToggle />
    </header>
  );
}
