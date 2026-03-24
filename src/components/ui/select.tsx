import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-border-strong bg-white px-3 text-sm text-text-strong outline-none focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted",
        className,
        props.value ? undefined : "text-text-muted",
      )}
      {...props}
    />
  );
}
