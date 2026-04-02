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
  description,
  actions,
  className,
  highlights = [],
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[32px] border border-border-strong bg-[linear-gradient(135deg,rgba(238,242,255,0.98)_0%,rgba(255,255,255,0.98)_50%,rgba(209,250,229,0.68)_100%)] p-6 shadow-[0_1px_0_rgba(99,102,241,0.06)]",
        className,
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{eyebrow}</Badge>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-[-0.05em] text-text-strong sm:text-[2.15rem]">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-7 text-text-muted sm:text-[15px]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>
      {highlights.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {highlights.map((highlight) => (
            <div
              className="rounded-[24px] border border-white/80 bg-white/84 px-4 py-4 backdrop-blur"
              key={`${highlight.label}-${highlight.value}`}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted">
                {highlight.label}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.05em] text-text-strong">
                {highlight.value}
              </p>
              {highlight.meta ? (
                <p className="mt-2 text-xs leading-5 text-text-muted">{highlight.meta}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
