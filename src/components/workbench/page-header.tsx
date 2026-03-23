import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  routeLabel: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow = "Workbench",
  title,
  description,
  routeLabel,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border-strong bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{eyebrow}</Badge>
          <span className="font-mono text-xs text-text-muted">{routeLabel}</span>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text-strong">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-text-muted">
            {description}
          </p>
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
