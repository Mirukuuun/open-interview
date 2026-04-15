import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      className={cn(
        "min-h-[84px] w-full rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-[13px] leading-[1.55] text-[color:var(--color-foreground)] outline-none transition-colors duration-150 ease-out placeholder:text-[color:var(--color-muted-foreground)] focus:border-[color:var(--color-brand)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/20 disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-subtle)] disabled:text-[color:var(--color-muted-foreground)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
