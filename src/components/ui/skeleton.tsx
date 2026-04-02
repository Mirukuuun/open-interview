import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-[16px] bg-border-muted/80 [animation:skeleton-pulse_1.4s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}
