import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border-strong bg-white px-3 text-sm text-text-strong outline-none placeholder:text-text-muted focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted",
        className,
      )}
      {...props}
    />
  );
}
