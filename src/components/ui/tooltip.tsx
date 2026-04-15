"use client";

import { useState, type ReactElement, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type TooltipSide = "top" | "right" | "bottom" | "left";

type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  side?: TooltipSide;
  className?: string;
};

const sideClasses: Record<TooltipSide, string> = {
  top: "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2",
  right: "left-[calc(100%+6px)] top-1/2 -translate-y-1/2",
  bottom: "top-[calc(100%+6px)] left-1/2 -translate-x-1/2",
  left: "right-[calc(100%+6px)] top-1/2 -translate-y-1/2",
};

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onBlur={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-30 whitespace-nowrap rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-foreground)] shadow-[var(--shadow-md)]",
            sideClasses[side],
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
