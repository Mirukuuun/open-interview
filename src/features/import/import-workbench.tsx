import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { SourceDocumentRecord } from "@/server/repositories/source-document-repository";

import { ImportActionsPanel } from "./import-actions-panel";

type ImportWorkbenchProps = {
  manualQaOptions: {
    categories: string[];
    tags: string[];
  };
  recentSources: SourceDocumentRecord[];
  totalSources: number;
};

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(timestamp));
}

function summarizeText(rawText: string) {
  const compactText = rawText.replace(/\s+/g, " ").trim();

  if (compactText.length <= 140) {
    return compactText;
  }

  return `${compactText.slice(0, 137).trimEnd()}...`;
}

function kindLabel(kind: SourceDocumentRecord["kind"]) {
  switch (kind) {
    case "interview_experience":
      return "面经";
    case "knowledge_note":
      return "知识笔记";
    case "resume":
      return "简历";
    case "manual_input":
      return "手工录入";
    default:
      return kind;
  }
}

function parseStatusBadge(
  parseStatus: SourceDocumentRecord["parseStatus"],
): {
  label: string;
  tone: "accent" | "warning" | "success" | "neutral";
} {
  switch (parseStatus) {
    case "not_started":
      return { label: "待处理", tone: "accent" };
    case "pending":
      return { label: "排队中", tone: "warning" };
    case "running":
      return { label: "解析中", tone: "warning" };
    case "needs_review":
      return { label: "待人工处理", tone: "warning" };
    case "confirmed":
      return { label: "已入库", tone: "success" };
    case "failed":
      return { label: "失败", tone: "warning" };
    default:
      return { label: parseStatus, tone: "neutral" };
  }
}

export function ImportWorkbench({
  manualQaOptions,
  recentSources,
  totalSources,
}: ImportWorkbenchProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/review" variant="primary">
              打开审核队列
            </Button>
            <Button href="/questions">打开题库</Button>
          </>
        }
        routeLabel="/import"
        title="导入内容"
      />

      <DetailGrid
        items={[
          { label: "当前重点", value: "手工录入 / 直接入库" },
          { label: "次级入口", value: "粘贴原文" },
          { label: "最近来源", value: `${recentSources.length} 条` },
          { label: "后续处理", value: "审核队列" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.88fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading title="导入方式" />
          <ImportActionsPanel manualQaOptions={manualQaOptions} />
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <SectionHeading
              title={`最近来源（${totalSources}）`}
            />

            {recentSources.length === 0 ? (
              <EmptyList
                title="还没有导入内容"
              />
            ) : (
              <div className="space-y-3">
                {recentSources.map((source) => {
                  const statusBadge = parseStatusBadge(source.parseStatus);

                  return (
                    <div
                      className="rounded-xl border border-border-muted bg-surface-muted p-4"
                      key={source.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge>{kindLabel(source.kind)}</Badge>
                            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-text-strong">
                              {source.title}
                            </p>
                            <p className="font-mono text-xs text-text-muted">
                              {source.id}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-text-muted">
                          {formatTimestamp(source.createdAt)}
                        </p>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-text-muted">
                        {summarizeText(source.rawText)}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-muted">
                        {source.sourceUrl ? (
                          <span className="rounded-full bg-white px-3 py-1">
                            来源链接: {source.sourceUrl}
                          </span>
                        ) : null}
                        {source.kind === "manual_input" ? (
                          <Button href="/questions" variant="ghost">
                            打开题库
                          </Button>
                        ) : (
                          <Button href="/review" variant="ghost">
                            打开审核队列
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
