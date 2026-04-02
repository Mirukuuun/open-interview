import { Search } from "lucide-react";
import Link from "next/link";

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
        description="直接发起一轮 grounded 对话，引用、相关题目与检索细节会在回答后按需展开，不抢占首屏。"
        eyebrow="Grounded QA"
        highlights={[
          {
            label: "可用题目",
            value: `${overview.activeQuestionCount}`,
            meta: "已进入本地题库，可用于 grounded recall",
          },
          {
            label: "最近会话",
            value: `${overview.activeSessionCount}`,
            meta: "保留上下文，方便连续追问",
          },
          {
            label: "已存分块",
            value: `${overview.totalChunkCount}`,
            meta: `${overview.questionChunkCount}/${overview.answerChunkCount}/${overview.sourceExcerptChunkCount} question/answer/source`,
          },
        ]}
        title="AI 问答"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-6 bg-[linear-gradient(180deg,rgba(238,242,255,0.88)_0%,rgba(255,255,255,0.98)_62%)]">
            <SectionHeading
              description="优先先问问题。只有在你需要的时候，再去展开引用、related questions 和 retrieval trace。"
              title="开始一轮 grounded 对话"
            />
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  label: "回答原则",
                  value: "先回应，再说明本地支持强弱",
                },
                {
                  label: "默认体验",
                  value: "聊天首屏，避免调试信息打扰",
                },
                {
                  label: "追溯方式",
                  value: "回答后展开引用与检索摘要",
                },
              ].map((item) => (
                <div
                  className="rounded-[22px] border border-white/80 bg-white/84 px-4 py-4"
                  key={item.label}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-strong">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <QaAskForm initialQuery={initialQuery} mode="new" />
          </SurfaceCard>

          <SurfaceCard className="space-y-4" muted>
            <SectionHeading
              description="题库题目、标准答案和来源摘录会共同参与 recall。命中不足时也会先给你可执行回答，再明确支持程度。"
              title="当前知识覆盖"
            />
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">question {overview.questionChunkCount}</Badge>
              <Badge tone="success">answer {overview.answerChunkCount}</Badge>
              <Badge>source {overview.sourceExcerptChunkCount}</Badge>
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4" muted>
            <SectionHeading
              description="保留最近会话，便于连续追问和快速回看。"
              title="最近会话"
            />
            {recentSessions.length === 0 ? (
              <EmptyList
                description="你的第一条问题会自动创建会话，并把 grounded 引用收纳在回答下方。"
                icon={Search}
                title="完成第一轮对话"
              />
            ) : (
              <div className="reveal-list space-y-3">
                {recentSessions.map((session) => (
                  <Link
                    className="interactive-card block rounded-[24px] border border-border-strong bg-white px-4 py-4 focus-visible:outline-none"
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
        </div>
      </div>
    </div>
  );
}
