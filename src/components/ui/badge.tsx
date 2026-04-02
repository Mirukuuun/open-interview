import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "success" | "warning";
};

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral:
    "border border-border-muted bg-surface-muted text-[var(--text-muted)]",
  accent: "border border-transparent bg-accent-soft text-accent",
  success: "border border-transparent bg-success-soft text-success",
  warning: "border border-transparent bg-amber-100 text-warning",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
