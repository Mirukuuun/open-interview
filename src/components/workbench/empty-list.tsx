import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyListProps = {
  title: string;
  description?: string;
  bullets?: string[];
  icon?: LucideIcon;
  action?: {
    label: string;
    href: string;
  };
};

export function EmptyList({
  title,
  description,
  bullets = [],
  icon: Icon,
  action,
}: EmptyListProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-6 text-center">
      {Icon ? (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h3 className="mt-4 text-base font-semibold text-[color:var(--color-foreground)]">
        {title}
      </h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-[13px] leading-[1.6] text-[color:var(--color-muted-foreground)]">
          {description}
        </p>
      ) : null}
      {bullets.length > 0 ? (
        <ul className="mx-auto mt-4 max-w-xl space-y-2 text-left text-[13px] text-[color:var(--color-foreground)]">
          {bullets.map((bullet) => (
            <li className="flex gap-2" key={bullet}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand)]" />
              <span className="leading-6">{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {action ? (
        <div className="mt-6">
          <Button href={action.href} size="xl" variant="primary">
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
