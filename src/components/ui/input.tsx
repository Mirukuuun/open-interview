import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-[13px] text-[color:var(--color-foreground)] outline-none transition-colors duration-150 ease-out placeholder:text-[color:var(--color-muted-foreground)] focus:border-[color:var(--color-brand)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/20 disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-subtle)] disabled:text-[color:var(--color-muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
