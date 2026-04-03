import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  routeLabel?: string;
  actions?: React.ReactNode;
  className?: string;
  highlights?: Array<{
    label: string;
    value: string;
    meta?: string;
  }>;
};

export function PageHeader({
  eyebrow = "工作台",
  title,
  actions,
  className,
  highlights = [],
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[26px] border border-border-strong bg-[linear-gradient(180deg,rgba(250,248,253,0.98)_0%,rgba(255,255,255,0.97)_100%)] p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Badge tone="accent">{eyebrow}</Badge>
          <div className="space-y-1">
            <h1 className="text-[1.65rem] font-semibold tracking-[-0.04em] text-text-strong sm:text-[1.8rem]">
              {title}
            </h1>
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>
      {highlights.length > 0 ? (
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {highlights.map((highlight) => (
            <div
              className="rounded-[18px] border border-border-muted bg-white/82 px-4 py-3"
              key={`${highlight.label}-${highlight.value}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
                  {highlight.label}
                </p>
                <p className="text-lg font-semibold tracking-[-0.03em] text-text-strong">
                  {highlight.value}
                </p>
              </div>
              {highlight.meta ? <p className="mt-1.5 text-xs leading-5 text-text-muted">{highlight.meta}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
