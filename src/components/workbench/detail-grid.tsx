import { cn } from "@/lib/utils";

type DetailGridProps = {
  items: Array<{
    label: string;
    value: string;
    meta?: string;
  }>;
  className?: string;
};

export function DetailGrid({ items, className }: DetailGridProps) {
  return (
    <dl className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <div
          className="overflow-hidden rounded-[24px] border border-border-muted bg-surface-muted px-4 py-4"
          key={`${item.label}-${item.value}-${item.meta ?? ""}`}
        >
          <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted">
            {item.label}
          </dt>
          <dd className="mt-2 text-xl font-bold tracking-[-0.04em] text-text-strong">
            {item.value}
          </dd>
          {item.meta ? (
            <p className="mt-2 text-xs leading-5 text-text-muted">{item.meta}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
