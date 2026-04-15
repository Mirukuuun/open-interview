import { cn } from "@/lib/utils";

import { StatsRow } from "./stats-row";

type PageHeaderProps = {
  /** @deprecated eyebrow removed per design.md §5.3; accepted but ignored for backward compat */
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
  className?: string;
  highlights?: Array<{
    label: string;
    value: string;
    meta?: string;
  }>;
};

export function PageHeader({
  title,
  actions,
  className,
  highlights = [],
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-base font-semibold text-[color:var(--color-foreground)]">
          {title}
        </h1>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {highlights.length > 0 ? <StatsRow items={highlights} /> : null}
    </div>
  );
}
