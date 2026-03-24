"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { primaryNavItems } from "./route-definitions";

function isActive(pathname: string, match: string) {
  return pathname === match || pathname.startsWith(`${match}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 rounded-none bg-surface-nav px-4 py-5 text-text-inverse lg:min-h-screen lg:w-[272px] lg:rounded-r-[28px] lg:px-5">
      <div className="space-y-2 border-b border-white/10 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/55">
          Open Interview
        </p>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-[-0.03em] text-white">
            MVP 工作台
          </h1>
          <p className="text-sm leading-6 text-slate-300">
            覆盖导入、审核、检索、AI 问答和简历链路。
          </p>
        </div>
      </div>

      <nav className="space-y-2">
        {primaryNavItems.map((item) => {
          const active = isActive(pathname, item.match);

          return (
            <Link
              className={cn(
                "block rounded-2xl border px-4 py-3 transition-colors",
                active
                  ? "border-blue-300/25 bg-surface-nav-muted text-white"
                  : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white",
              )}
              href={item.href}
              key={item.href}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{item.label}</span>
                {item.badge ? (
                  <Badge className="bg-white/10 text-white" tone="neutral">
                    {item.badge}
                  </Badge>
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
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-400">
          当前状态
        </p>
        <p className="mt-2 text-sm font-medium text-white">
          已接入真实数据链路
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          当前以最小工作流为主，保留清晰路由和可追踪数据路径。
        </p>
      </div>
    </aside>
  );
}
