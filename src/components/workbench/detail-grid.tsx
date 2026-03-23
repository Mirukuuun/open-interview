type DetailGridProps = {
  items: Array<{
    label: string;
    value: string;
  }>;
};

export function DetailGrid({ items }: DetailGridProps) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3"
          key={`${item.label}-${item.value}`}
        >
          <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm font-medium text-text-strong">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
