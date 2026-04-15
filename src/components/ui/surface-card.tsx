import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SurfaceCardProps = React.HTMLAttributes<HTMLDivElement> & {
  muted?: boolean;
  /**
   * @deprecated `.interactive-card` global CSS class was removed in M1/T1.1.
   * Apply hover affordances via `className` (e.g. `hover:border-brand`) instead.
   * The prop is still accepted to preserve back-compat with existing call sites.
   */
  interactive?: boolean;
};

export function SurfaceCard({
  className,
  interactive,
  muted = false,
  ...props
}: SurfaceCardProps) {
  // `interactive` is accepted for backward compatibility but intentionally a no-op:
  // hover styling should now be expressed via `className` in call sites.
  void interactive;
  return <Card className={cn("p-5", className)} muted={muted} {...props} />;
}
