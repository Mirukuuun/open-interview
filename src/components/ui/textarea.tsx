import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[132px] w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm leading-6 text-text-strong outline-none placeholder:text-text-muted focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted",
        className,
      )}
      {...props}
    />
  );
}
