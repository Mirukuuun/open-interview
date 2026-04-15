import { cn } from "@/lib/utils";

type StatsRowProps = {
  items: Array<{
    label: string;
    value: string;
    meta?: string;
  }>;
  className?: string;
};

export function StatsRow({ items, className }: StatsRowProps) {
  return (
    <dl className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <div
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3"
          key={`${item.label}-${item.value}`}
        >
          <dt className="text-[11px] font-medium text-[color:var(--color-muted-foreground)]">
            {item.label}
          </dt>
          <dd className="mt-1 text-[15px] font-semibold text-[color:var(--color-foreground)]">
            {item.value}
          </dd>
          {item.meta ? (
            <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
              {item.meta}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
