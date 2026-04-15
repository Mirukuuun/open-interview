"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  buildPrimaryNavItems,
  type NavigationSummary,
} from "./route-definitions";

function isActive(pathname: string, match: string) {
  return pathname === match || pathname.startsWith(`${match}/`);
}

const sidebarCollapsedStorageKey = "open-interview:sidebar-collapsed";
const sidebarCollapsedChangeEvent = "open-interview:sidebar-collapsed-change";

function subscribeToSidebarPreference(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(sidebarCollapsedChangeEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(sidebarCollapsedChangeEvent, callback);
  };
}

function getSidebarCollapsedSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(sidebarCollapsedStorageKey) === "1";
}

export function AppSidebar({
  summary,
}: {
  summary: NavigationSummary;
}) {
  const pathname = usePathname();
  const primaryNavItems = buildPrimaryNavItems(summary);
  const collapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarCollapsedSnapshot,
    () => false,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    const nextValue = !collapsed;

    window.localStorage.setItem(
      sidebarCollapsedStorageKey,
      nextValue ? "1" : "0",
    );
    window.dispatchEvent(new Event(sidebarCollapsedChangeEvent));
  }

  return (
    <>
      <button
        aria-label={mobileOpen ? "关闭导航" : "打开导航"}
        className="fixed left-3 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] transition-colors duration-150 ease-out hover:bg-[color:var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] focus-visible:ring-offset-2 lg:hidden"
        onClick={() => setMobileOpen((prev) => !prev)}
        type="button"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {mobileOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-x-0 top-0 z-30 flex flex-col gap-4 bg-[color:var(--color-surface-muted)] px-4 py-4 text-[color:var(--color-foreground)] transition-transform duration-200 ease-out lg:static lg:inset-auto lg:min-h-screen lg:translate-y-0 lg:border-r lg:border-[color:var(--color-border)] lg:transition-[width,padding] lg:duration-200 lg:ease-out",
          mobileOpen ? "translate-y-0" : "-translate-y-full lg:translate-y-0",
          collapsed ? "lg:w-[72px] lg:px-2" : "lg:w-[248px] lg:px-3",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            className="flex min-w-0 items-center gap-2"
            href="/"
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-brand)] text-[11px] font-semibold text-white">
              OI
            </div>
            {!collapsed ? (
              <span className="truncate text-[13px] font-semibold text-[color:var(--color-foreground)]">
                Open Interview
              </span>
            ) : null}
          </Link>
          <button
            aria-label={collapsed ? "展开导航" : "收起导航"}
            className="hidden h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted-foreground)] transition-colors duration-150 ease-out hover:bg-[color:var(--color-surface-subtle)] hover:text-[color:var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] focus-visible:ring-offset-2 lg:inline-flex"
            onClick={toggleCollapsed}
            type="button"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <Separator />

        <nav className="flex flex-col gap-1">
          {primaryNavItems.map((item, index) => {
            const prevItem = primaryNavItems[index - 1];
            const showGroupSeparator =
              prevItem && prevItem.group !== item.group;
            const active = isActive(pathname, item.match);
            const Icon = item.icon;

            const navLink = (
              <Link
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-[13px] font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] focus-visible:ring-offset-2",
                  collapsed ? "justify-center px-0" : "",
                  active
                    ? "bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]"
                    : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-surface-subtle)] hover:text-[color:var(--color-foreground)] active:bg-[color:var(--color-surface-subtle)]",
                )}
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed ? (
                  <>
                    <span className="flex-1 truncate text-left">
                      {item.label}
                    </span>
                    {item.badge ? (
                      <Badge tone="brand" variant="soft">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </>
                ) : null}
              </Link>
            );

            return (
              <div key={item.href}>
                {showGroupSeparator ? <Separator className="my-2" /> : null}
                {collapsed ? (
                  <Tooltip content={item.label} side="right">
                    {navLink}
                  </Tooltip>
                ) : (
                  navLink
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
