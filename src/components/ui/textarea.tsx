import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      className={cn(
        "min-h-[132px] w-full rounded-[18px] border border-border-strong bg-white px-4 py-3 text-sm leading-6 text-text-strong outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out placeholder:text-text-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
