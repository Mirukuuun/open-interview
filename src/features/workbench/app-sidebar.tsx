"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

  function toggleCollapsed() {
    const nextValue = !collapsed;

    window.localStorage.setItem(
      sidebarCollapsedStorageKey,
      nextValue ? "1" : "0",
    );
    window.dispatchEvent(new Event(sidebarCollapsedChangeEvent));
  }

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col gap-6 rounded-none bg-surface-nav px-4 py-5 text-text-inverse lg:min-h-screen lg:rounded-r-[28px] lg:transition-[width,padding] lg:duration-200 lg:ease-out",
        collapsed ? "lg:w-[72px] lg:px-3" : "lg:w-[272px] lg:px-4",
      )}
    >
      <div className="space-y-4 border-b border-white/10 pb-5">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-3",
              collapsed ? "justify-center" : null,
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/12 bg-[linear-gradient(135deg,rgba(129,140,248,0.34),rgba(255,255,255,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              {collapsed ? (
                <span className="text-sm font-semibold tracking-[0.08em] text-white">
                  OI
                </span>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-200/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/55" />
                </div>
              )}
            </div>
            {!collapsed ? (
              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">
                  Open Interview
                </p>
                <h1 className="truncate text-base font-semibold tracking-[-0.03em] text-white">
                  专业陪练台
                </h1>
              </div>
            ) : null}
          </div>
          <button
            aria-label={collapsed ? "展开导航" : "收起导航"}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/80 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 lg:inline-flex"
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
        {!collapsed ? (
          <div>
            <p className="text-sm font-medium text-white/72">工作台导航</p>
          </div>
        ) : null}
      </div>

      <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0 lg:space-y-2 lg:overflow-x-visible">
        {primaryNavItems.map((item, index) => {
          const prevItem = primaryNavItems[index - 1];
          const showDivider = prevItem && prevItem.group !== item.group;
          const active = isActive(pathname, item.match);
          const Icon = item.icon;

          return (
            <div key={item.href} className="shrink-0 lg:shrink">
            {showDivider ? (
              <div className="my-2 hidden border-t border-white/10 lg:block" />
            ) : null}
            <Link
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "group relative block border transition-[border-color,background-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                collapsed
                  ? "rounded-[20px] px-0 py-2.5"
                  : "rounded-[22px] px-3 py-3",
                active
                  ? "border-indigo-300/28 bg-surface-nav-muted text-white hover:border-indigo-200/30"
                  : "border-transparent text-slate-300 hover:border-white/12 hover:bg-white/10 hover:text-white focus-visible:border-white/12 focus-visible:bg-white/10 focus-visible:text-white",
              )}
              href={item.href}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={cn(
                  "flex min-w-0 items-center",
                  collapsed ? "justify-center" : "justify-between gap-3",
                )}
              >
                <div
                  className={cn(
                    "flex min-w-0 items-center gap-3",
                    collapsed ? "justify-center" : null,
                  )}
                >
                  <div
                    className={cn(
                      "relative flex shrink-0 items-center justify-center rounded-[16px] border transition-colors duration-200 ease-out",
                      collapsed ? "h-11 w-11" : "h-10 w-10",
                      active
                        ? "border-white/10 bg-white/12 text-white"
                        : "border-white/6 bg-white/4 text-slate-300 group-hover:border-white/12 group-hover:bg-white/12 group-hover:text-white group-focus-visible:border-white/12 group-focus-visible:bg-white/12 group-focus-visible:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {collapsed && item.badge ? (
                      <>
                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-300" />
                        <span className="sr-only">{`${item.label} ${item.badge}`}</span>
                      </>
                    ) : null}
                  </div>
                  {!collapsed ? (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {item.label}
                        </span>
                        {active ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
                {!collapsed && item.badge ? (
                  <Badge className="bg-white/10 text-white" tone="neutral">
                    {item.badge}
                  </Badge>
                ) : null}
              </div>
              {collapsed ? <span className="sidebar-tooltip">{item.label}</span> : null}
            </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
