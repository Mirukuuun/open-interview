import Link from "next/link";

import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

import { QaAskForm } from "./qa-ask-form";

type QaWorkbenchProps = {
  initialQuery?: string;
  overview: {
    activeQuestionCount: number;
    activeSessionCount: number;
    totalChunkCount: number;
    questionChunkCount: number;
    answerChunkCount: number;
    sourceExcerptChunkCount: number;
  };
  recentSessions: Array<{
    id: string;
    title: string | null;
    status: string;
    updatedAt: string;
    turnCount: number;
    latestUserQuery: string | null;
  }>;
};

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

export function QaWorkbench({
  initialQuery = "",
  overview,
  recentSessions,
}: QaWorkbenchProps) {
  const newestSession = recentSessions[0];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            {newestSession ? (
              <Button href={`/qa/${newestSession.id}`}>打开最新会话</Button>
            ) : null}
            <Button href="/questions" variant="primary">
              打开题库
            </Button>
          </>
        }
        description="基于本地题库提问，答案会附带引用和检索轨迹。"
        routeLabel="/qa"
        title="AI 问答"
      />

      <DetailGrid
        items={[
          { label: "可用题目", value: `${overview.activeQuestionCount}` },
          { label: "会话数", value: `${overview.activeSessionCount}` },
          { label: "已存分块", value: `${overview.totalChunkCount}` },
          {
            label: "分块结构",
            value: `${overview.questionChunkCount}/${overview.answerChunkCount}/${overview.sourceExcerptChunkCount}`,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading title="提问" />
          <QaAskForm initialQuery={initialQuery} mode="new" />
          <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4 text-sm leading-6 text-text-muted">
            当前默认使用本地 FTS 和结构化召回，不依赖外部向量服务。
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4" muted>
            <SectionHeading title="最近会话" />
            {recentSessions.length === 0 ? (
              <EmptyList
                bullets={[
                  "先提一个问题创建会话。",
                  "会话详情页会保留轮次、引用和检索轨迹。",
                ]}
                description="还没有 QA 会话。"
                title="还没有会话"
              />
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <Link
                    className="block rounded-xl border border-border-strong bg-white px-4 py-4 transition-colors hover:border-accent hover:bg-accent-soft/30"
                    href={`/qa/${session.id}`}
                    key={session.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text-strong">
                        {session.title ?? "未命名会话"}
                      </p>
                      <Badge>{session.status}</Badge>
                    </div>
                    {session.latestUserQuery ? (
                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        {session.latestUserQuery}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        会话已创建，但还没有轮次。
                      </p>
                    )}
                    <p className="mt-3 text-xs text-text-muted">
                      {session.turnCount} 轮 • 更新于 {formatDateTime(session.updatedAt)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading title="轨迹说明" />
            <div className="space-y-3 text-sm text-text-muted">
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                每次回答都会存 `retrieval_log` 和引用数据。
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                来源摘录、题目分块和答案分块都会本地持久化。
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                `/qa/:sessionId` 会展示命中片段、策略说明和相关题目。
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
