"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  buildPrimaryNavItems,
  type NavigationSummary,
} from "./route-definitions";

function isActive(pathname: string, match: string) {
  return pathname === match || pathname.startsWith(`${match}/`);
}

export function AppSidebar({
  summary,
}: {
  summary: NavigationSummary;
}) {
  const pathname = usePathname();
  const primaryNavItems = buildPrimaryNavItems(summary);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 rounded-none bg-surface-nav px-4 py-5 text-text-inverse lg:min-h-screen lg:w-[288px] lg:rounded-r-[32px] lg:px-5">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(129,140,248,0.42),rgba(255,255,255,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="grid grid-cols-2 gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-200/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/55" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">
              Open Interview
            </p>
            <h1 className="text-lg font-bold tracking-[-0.04em] text-white">
              专业陪练台
            </h1>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm leading-6 text-slate-300">
            从导入、审核到练习与 grounded QA，把面试资料沉淀成长期可复盘的本地知识库。
          </p>
        </div>
      </div>

      <nav className="space-y-2">
        {primaryNavItems.map((item) => {
          const active = isActive(pathname, item.match);
          const Icon = item.icon;

          return (
            <Link
              className={cn(
                "interactive-card block rounded-[24px] border px-4 py-3.5 focus-visible:outline-none",
                active
                  ? "border-indigo-300/30 bg-surface-nav-muted text-white"
                  : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white",
              )}
              href={item.href}
              key={item.href}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors",
                      active
                        ? "border-white/10 bg-white/12 text-white"
                        : "border-white/6 bg-white/4 text-slate-300",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{item.label}</span>
                      {active ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "mt-2 text-xs leading-5",
                        active ? "text-slate-200" : "text-slate-400",
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
                {item.badge ? (
                  <Badge className="bg-white/10 text-white" tone="neutral">
                    {item.badge}
                  </Badge>
                ) : null}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
