import { cn } from "@/lib/utils";

type SurfaceCardProps = React.HTMLAttributes<HTMLDivElement> & {
  muted?: boolean;
  interactive?: boolean;
};

export function SurfaceCard({
  className,
  interactive = false,
  muted = false,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] border p-5 shadow-[0_1px_0_rgba(99,102,241,0.06)]",
        muted
          ? "border-border-muted bg-surface-muted"
          : "border-border-strong bg-surface-strong",
        interactive ? "interactive-card" : null,
        className,
      )}
      {...props}
    />
  );
}
