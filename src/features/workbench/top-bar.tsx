import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border-strong bg-background/95 px-5 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
          Open Interview
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-text-strong">
            工作台
          </h2>
          <Badge tone="success">本地优先</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:w-[540px] lg:flex-row lg:items-center">
        <div className="flex-1">
          <Input
            aria-label="全局搜索"
            placeholder="全局搜索（题目、面经、会话）"
            readOnly
          />
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-border-strong bg-white px-3 py-2 text-xs text-text-muted">
          <span className="h-2 w-2 rounded-full bg-warning" />
          模型服务未连接
        </div>
      </div>
    </header>
  );
}
