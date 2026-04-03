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
    <dl className={cn("grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <div
          className="overflow-hidden rounded-[20px] border border-border-muted bg-surface-muted/88 px-4 py-3.5"
          key={`${item.label}-${item.value}-${item.meta ?? ""}`}
        >
          <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
            {item.label}
          </dt>
          <dd className="mt-1.5 text-[19px] font-semibold tracking-[-0.03em] text-text-strong">
            {item.value}
          </dd>
          {item.meta ? (
            <p className="mt-1.5 text-xs leading-5 text-text-muted">{item.meta}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
