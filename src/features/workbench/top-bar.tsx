import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border-strong bg-background/90 px-4 py-3.5 backdrop-blur sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
          Open Interview
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold tracking-[-0.03em] text-text-strong">
            工作台
          </h2>
          <Badge tone="success">本地优先</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:w-[520px] lg:flex-row lg:items-center">
        <div className="flex-1">
          <Input
            aria-label="全局搜索"
            className="bg-white/90"
            placeholder="全局搜索（题目、面经、会话）"
            readOnly
          />
        </div>
        <div className="flex min-h-10 items-center gap-2 self-start rounded-full border border-border-strong bg-white/92 px-3 py-2 text-xs text-text-muted">
          <span className="h-2 w-2 rounded-full bg-warning" />
          模型服务未连接
        </div>
      </div>
    </header>
  );
}
