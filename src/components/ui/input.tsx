import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[14px] border border-border-strong bg-white px-4 text-sm text-text-strong outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out placeholder:text-text-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted",
        className,
      )}
      {...props}
    />
  );
}
