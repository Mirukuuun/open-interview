import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "success" | "warning";
};

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral:
    "border border-border-muted bg-surface-muted text-[var(--text-muted)]",
  accent: "bg-accent-soft text-accent",
  success: "bg-emerald-100 text-success",
  warning: "bg-amber-100 text-warning",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
