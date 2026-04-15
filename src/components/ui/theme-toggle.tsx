"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ui/theme-provider";
import { cn } from "@/lib/utils";

const LABELS = {
  system: "跟随系统主题",
  light: "浅色主题",
  dark: "深色主题",
} as const;

const NEXT = {
  system: "light",
  light: "dark",
  dark: "system",
} as const;

const ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];

  return (
    <button
      aria-label={`当前${LABELS[theme]}，点击切换到${LABELS[NEXT[theme]]}`}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] transition-colors duration-150 ease-out hover:bg-[color:var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] focus-visible:ring-offset-2",
        className,
      )}
      onClick={() => setTheme(NEXT[theme])}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
