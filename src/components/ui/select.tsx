import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-[14px] border border-border-strong bg-white px-4 text-sm text-text-strong outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted",
        className,
        props.value ? undefined : "text-text-muted",
      )}
      {...props}
    />
  );
}
