import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    <div className="rounded-[28px] border border-dashed border-border-strong bg-surface-muted p-5">
      <div className="flex flex-wrap items-start gap-4">
        {Icon ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/10 bg-accent-soft text-accent">
            <Icon className="h-6 w-6" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge>待开始</Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-text-strong">
            {title}
          </h3>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-text-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {bullets.length > 0 ? (
        <ul className="reveal-list mt-5 space-y-2 text-sm text-text-strong">
          {bullets.map((bullet) => (
            <li className="flex gap-2" key={bullet}>
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="leading-6">{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {action ? (
        <div className="mt-5">
          <Button href={action.href} variant="primary">
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
