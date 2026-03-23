import { cn } from "@/lib/utils";

type SurfaceCardProps = React.HTMLAttributes<HTMLDivElement> & {
  muted?: boolean;
};

export function SurfaceCard({
  className,
  muted = false,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        muted
          ? "border-border-muted bg-surface-muted"
          : "border-border-strong bg-surface-strong",
        className,
      )}
      {...props}
    />
  );
}
