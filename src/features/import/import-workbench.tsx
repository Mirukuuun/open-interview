import { Upload } from "lucide-react";

import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { formatDateTimeLabel } from "@/lib/date-time";
import type { SourceDocumentRecord } from "@/server/repositories/source-document-repository";
import type { WorkspaceSummary } from "@/server/services/workspace-summary-service";

import { ImportActionsPanel } from "./import-actions-panel";

type ImportWorkbenchProps = {
  manualQaOptions: {
    categories: string[];
    tags: string[];
  };
  recentSources: SourceDocumentRecord[];
  totalSources: number;
  workspaceSummary: WorkspaceSummary;
};

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

function reviewActionLabel(parseStatus: SourceDocumentRecord["parseStatus"]) {
  switch (parseStatus) {
    case "not_started":
      return "去审核队列创建任务";
    case "needs_review":
      return "去审核队列处理候选";
    default:
      return "打开审核队列";
  }
}

export function ImportWorkbench({
  manualQaOptions,
  recentSources,
  totalSources,
  workspaceSummary,
}: ImportWorkbenchProps) {
  const showOnboarding = totalSources === 0 && workspaceSummary.activeQuestionCount === 0;

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
        highlights={[
          {
            label: "当前重点",
            value: "上传 / 手工录题",
            meta: "最快进入题库的两个入口",
          },
          {
            label: "最近来源",
            value: `${recentSources.length}`,
            meta: `累计来源 ${totalSources}`,
          },
          {
            label: "后续处理",
            value: "审核队列",
            meta: "解析与人工确认会在这里继续",
          },
          {
            label: "当前题库",
            value: `${workspaceSummary.activeQuestionCount}`,
            meta: "可直接回流到题库、练习与 QA",
          },
        ]}
        title="导入内容"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.88fr)] xl:[--import-panel-height:min(720px,calc(100vh-15rem))] xl:items-stretch">
        <SurfaceCard className="space-y-5 xl:flex xl:h-[var(--import-panel-height)] xl:flex-col">
          <SectionHeading title="导入方式" />
          {showOnboarding ? (
            <div className="rounded-[28px] border border-border-strong bg-[linear-gradient(135deg,rgba(238,242,255,0.98)_0%,rgba(255,255,255,0.98)_52%,rgba(209,250,229,0.72)_100%)] px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                首次体验
              </p>
              <h3 className="mt-3 text-2xl font-bold tracking-[-0.05em] text-text-strong">
                先把材料放进来，再把它变成可练的题库。
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
                当前还没有题库内容。先从上传、粘贴或手工录题开始，确认候选结果后再去题库、随机练习或 grounded QA 继续使用。
              </p>
              <div className="reveal-list mt-5 grid gap-3 md:grid-cols-3">
                {[
                  "1. 导入文件、原文或手工问答。",
                  "2. 到审核队列确认候选并保留来源。",
                  "3. 回到题库、练习或 AI 问答继续使用。",
                ].map((step) => (
                  <div
                    className="rounded-[22px] border border-white/80 bg-white/86 px-4 py-4 text-sm leading-6 text-text-strong"
                    key={step}
                  >
                    {step}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href="/review" variant="primary">
                  打开审核队列
                </Button>
                <Button href="/questions">查看题库入口</Button>
              </div>
            </div>
          ) : null}
          <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
            <ImportActionsPanel manualQaOptions={manualQaOptions} />
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5 xl:flex xl:h-[var(--import-panel-height)] xl:flex-col">
          <SectionHeading title={`最近来源（${totalSources}）`} />

          {recentSources.length === 0 ? (
            <div className="xl:min-h-0 xl:flex-1">
              <EmptyList
                description="上传文件、粘贴原文或手工录题后，这里会保留最近来源并引导你继续进入审核队列。"
                icon={Upload}
                title="把第一份材料放进来"
              />
            </div>
          ) : (
            <div className="space-y-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
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
                        {formatDateTimeLabel(source.createdAt)}
                      </p>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      {summarizeText(source.rawText)}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-muted">
                      {source.fileName ? (
                        <span className="rounded-full bg-white px-3 py-1">
                          文件: {source.fileName}
                        </span>
                      ) : null}
                      {source.mimeType ? (
                        <span className="rounded-full bg-white px-3 py-1">
                          MIME: {source.mimeType}
                        </span>
                      ) : null}
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
                          {reviewActionLabel(source.parseStatus)}
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
  );
}
