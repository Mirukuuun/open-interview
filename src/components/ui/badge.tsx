import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "accent" // alias of brand，保留向下兼容
  | "success"
  | "warning"
  | "destructive"
  | "info";

export type BadgeVariant = "solid" | "soft";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  variant?: BadgeVariant;
};

const solidMap: Record<BadgeTone, string> = {
  neutral:
    "border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] text-[color:var(--color-foreground)]",
  brand:
    "border border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white",
  accent:
    "border border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white",
  success:
    "border border-[color:var(--color-success)] bg-[color:var(--color-success)] text-white",
  warning:
    "border border-[color:var(--color-warning)] bg-[color:var(--color-warning)] text-white",
  destructive:
    "border border-[color:var(--color-destructive)] bg-[color:var(--color-destructive)] text-white",
  info: "border border-[color:var(--color-info)] bg-[color:var(--color-info)] text-white",
};

const softMap: Record<BadgeTone, string> = {
  neutral:
    "border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] text-[color:var(--color-muted-foreground)]",
  brand:
    "border border-transparent bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]",
  accent:
    "border border-transparent bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]",
  success:
    "border border-transparent bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]",
  warning:
    "border border-transparent bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  destructive:
    "border border-transparent bg-[color:var(--color-destructive-soft)] text-[color:var(--color-destructive)]",
  info: "border border-transparent bg-[color:var(--color-info-soft)] text-[color:var(--color-info)]",
};

export function Badge({
  className,
  tone = "neutral",
  variant = "soft",
  ...props
}: BadgeProps) {
  const map = variant === "solid" ? solidMap : softMap;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-medium",
        map[tone],
        className,
      )}
      {...props}
    />
  );
}
