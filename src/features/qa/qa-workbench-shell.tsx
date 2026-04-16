import Link from "next/link";

import type {
  QaSessionDetail,
  RecentQaSession,
} from "@/server/services/qa-session-service";
import { SafeMarkdown } from "@/components/content/safe-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeLabel } from "@/lib/date-time";
import { formatCategoryLabelOrFallback } from "@/lib/taxonomy-display";
import { cn } from "@/lib/utils";

import { QaAskForm } from "./qa-ask-form";
import { QaSessionDeleteButton } from "./qa-session-delete-button";

type QaWorkbenchShellProps = {
  initialQuery?: string;
  recentSessions: RecentQaSession[];
  activeSession?: QaSessionDetail;
};

function toneForAnswerMode(answerMode: string | undefined) {
  if (answerMode === "grounded_answered") {
    return "success" as const;
  }

  if (answerMode === "weak_support") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function labelForAnswerMode(answerMode: string | undefined) {
  if (answerMode === "grounded_answered") {
    return "本地依据充分";
  }

  if (answerMode === "weak_support") {
    return "部分结合本地材料";
  }

  return "通用回答";
}

function renderCitations(
  citations: NonNullable<QaWorkbenchShellProps["activeSession"]>["turns"][number]["citations"],
) {
  if (citations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white px-4 py-4 text-sm text-[color:var(--color-muted-foreground)]">
        当前这轮回答没有命中可展示的本地引用。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {citations.map((citation) => (
        <div
          className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-4"
          key={`${citation.owner_id}-${citation.label}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{citation.owner_type}</Badge>
            <Link
              className="text-sm font-semibold text-[color:var(--color-foreground)] hover:text-[color:var(--color-brand)]"
              href={citation.href}
            >
              {citation.label}
            </Link>
          </div>

          {citation.snippet ? (
            <p className="mt-3 whitespace-pre-wrap rounded-xl border border-[color:var(--color-border)] bg-surface-muted px-3 py-3 text-sm leading-6 text-[color:var(--color-foreground)]">
              {citation.snippet}
            </p>
          ) : null}

          {citation.source_document ? (
            <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
              来源：
              {citation.source_document.href ? (
                <Link
                  className="font-medium text-[color:var(--color-brand)] hover:underline"
                  href={citation.source_document.href}
                >
                  {citation.source_document.title}
                </Link>
              ) : (
                <span className="font-medium text-[color:var(--color-foreground)]">
                  {citation.source_document.title}
                </span>
              )}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function renderRelatedQuestions(
  relatedQuestions: NonNullable<QaWorkbenchShellProps["activeSession"]>["turns"][number]["related_questions"],
) {
  if (relatedQuestions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white px-4 py-4 text-sm text-[color:var(--color-muted-foreground)]">
        当前没有额外推荐的相关题目。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {relatedQuestions.map((question) => (
        <Link
          className="block rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 hover:border-[color:var(--color-brand)] transition-colors focus-visible:outline-none"
          href={`/questions/${question.id}`}
          key={question.id}
        >
          <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
            {question.question_text}
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            {formatCategoryLabelOrFallback(question.category)} · {question.source_count} 条来源
          </p>
        </Link>
      ))}
    </div>
  );
}

function renderRetrievalTrace(
  retrievalLog: NonNullable<QaWorkbenchShellProps["activeSession"]>["turns"][number]["retrieval_log"],
) {
  if (!retrievalLog) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white px-4 py-4 text-sm text-[color:var(--color-muted-foreground)]">
        这轮回答没有保存检索日志。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-foreground)]">
          normalized_query: {retrievalLog.final_context.normalized_query ?? retrievalLog.query_text}
        </div>
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-foreground)]">
          rewritten_query: {retrievalLog.final_context.rewritten_query ?? "none"}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>{retrievalLog.strategy}</Badge>
        <Badge tone="accent">
          lexical {retrievalLog.final_context.channel_counts?.lexical_hits ?? 0}
        </Badge>
        <Badge tone="success">
          vector {retrievalLog.final_context.channel_counts?.vector_hits ?? 0}
        </Badge>
        <Badge>
          merged {retrievalLog.final_context.channel_counts?.merged_hits ?? 0}
        </Badge>
      </div>

      {retrievalLog.final_context.retrieval_summary ? (
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-4 text-sm leading-6 text-[color:var(--color-foreground)]">
          {retrievalLog.final_context.retrieval_summary}
        </div>
      ) : null}

      {(retrievalLog.final_context.strategy_notes.length > 0 ||
        retrievalLog.final_context.warnings.length > 0) ? (
        <div className="flex flex-wrap gap-2">
          {retrievalLog.final_context.strategy_notes.map((note) => (
            <Badge key={note}>{note}</Badge>
          ))}
          {retrievalLog.final_context.warnings.map((warning) => (
            <Badge key={warning} tone="warning">
              {warning}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {retrievalLog.hits.slice(0, 8).map((hit) => (
          <div
            className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-4"
            key={`${hit.owner_type}-${hit.owner_id}-${hit.chunk_id ?? "none"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{hit.owner_type}</Badge>
              <Badge tone={hit.reason === "vector" ? "success" : "accent"}>
                {hit.reason}
              </Badge>
              <span className="font-mono text-xs text-[color:var(--color-muted-foreground)]">
                score {hit.score.toFixed(1)}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-foreground)]">
              {hit.snippet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderAssistantExtras(
  turn: NonNullable<QaWorkbenchShellProps["activeSession"]>["turns"][number],
) {
  if (turn.role !== "assistant") {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {turn.support_summary ? (
        <p className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
          {turn.support_summary}
        </p>
      ) : null}

      <details className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3">
        <summary className="rounded-lg text-sm font-semibold text-[color:var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] focus-visible:ring-offset-2">
          查看依据与相关问题
        </summary>
        <div className="mt-4 space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-muted-foreground)] uppercase">
              引用
            </p>
            {renderCitations(turn.citations)}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-muted-foreground)] uppercase">
              相关题目
            </p>
            {renderRelatedQuestions(turn.related_questions)}
          </div>
        </div>
      </details>

      <details className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3">
        <summary className="rounded-lg text-sm font-semibold text-[color:var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] focus-visible:ring-offset-2">
          查看检索摘要与调试信息
        </summary>
        <div className="mt-4">{renderRetrievalTrace(turn.retrieval_log)}</div>
      </details>
    </div>
  );
}

export function QaWorkbenchShell({
  initialQuery = "",
  recentSessions,
  activeSession,
}: QaWorkbenchShellProps) {
  const turns = activeSession?.turns ?? [];
  const latestAssistantTurn = [...turns].reverse().find((turn) => turn.role === "assistant");
  const promptSuggestions = [
    "请你做个自我介绍",
    "Redis 分布式锁这题应该怎么回答比较完整？",
    "如果面试官追问项目亮点，我该怎么组织表达？",
    "帮我把答案改得更像口语表达",
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="overflow-hidden rounded-[30px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(219,234,254,0.55)_0%,rgba(255,255,255,1)_60%)] shadow-sm">
          <div className="border-b border-[color:var(--color-border)] px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">QA</Badge>
              <span className="font-mono text-xs text-[color:var(--color-muted-foreground)]">/qa</span>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-foreground)]">
                AI 问答
              </h1>
              <p className="text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                chat-first grounded QA。
              </p>
            </div>

            <Button
              className="h-10 w-full justify-center"
              href="/qa"
              variant={activeSession ? "secondary" : "primary"}
            >
              新建会话
            </Button>
          </div>
        </div>

        <div className="rounded-[30px] border border-[color:var(--color-border)] bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between px-2 pb-3 pt-2">
            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">会话列表</p>
            <Badge>{recentSessions.length}</Badge>
          </div>

          {recentSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-surface-muted px-4 py-5 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
              还没有会话。直接在右侧输入你的第一条问题即可。
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session) => {
                const active = activeSession?.aiSession.id === session.id;

                return (
                  <div
                    className={cn(
                      "rounded-2xl border px-3 py-3 transition-colors",
                      active
                        ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-soft)]",
                    )}
                    key={session.id}
                  >
                    <div className="flex items-start gap-2">
                      <Link
                        className="min-w-0 flex-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] focus-visible:ring-offset-2"
                        href={`/qa/${session.id}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                            {session.title ?? "未命名会话"}
                          </p>
                          {active ? <Badge tone="accent">当前</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                          {session.latestUserQuery ?? "会话已创建，等待第一条问题。"}
                        </p>
                        <p className="mt-3 text-xs text-[color:var(--color-muted-foreground)]">
                          {session.turnCount} 轮 · {formatDateTimeLabel(session.updatedAt)}
                        </p>
                      </Link>

                      <QaSessionDeleteButton
                        active={active}
                        sessionId={session.id}
                        title={session.title}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-[78vh] flex-col overflow-hidden rounded-[32px] border border-[color:var(--color-border)] bg-white shadow-sm">
        <div className="border-b border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(247,249,251,0.9)_0%,rgba(255,255,255,1)_100%)] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">Chat</Badge>
                {latestAssistantTurn?.answer_mode ? (
                  <Badge tone={toneForAnswerMode(latestAssistantTurn.answer_mode)}>
                    {labelForAnswerMode(latestAssistantTurn.answer_mode)}
                  </Badge>
                ) : null}
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-foreground)]">
                  {activeSession?.aiSession.title ?? "开始一轮新的对话"}
                </h2>
              </div>
            </div>

            {activeSession ? (
              <div className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-muted-foreground)]">
                <span className="font-medium text-[color:var(--color-foreground)]">
                  {turns.length}
                </span>
                {" "}
                轮对话 · 最近更新 {formatDateTimeLabel(activeSession.aiSession.updated_at)}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto bg-[color:var(--color-surface)] px-4 py-5 sm:px-6 sm:py-6">
            {turns.length === 0 ? (
              <div className="mx-auto flex h-full max-w-3xl flex-col justify-center">
                <div className="rounded-[32px] border border-[color:var(--color-border)] bg-white/90 px-6 py-8 shadow-sm backdrop-blur">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">对话模式</Badge>
                    <Badge>引用按需展开</Badge>
                  </div>
                  <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--color-foreground)]">
                    问一个问题，直接开始。
                  </h3>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {promptSuggestions.map((suggestion) => (
                      <div
                        className="rounded-2xl border border-[color:var(--color-border)] bg-surface-muted px-4 py-4 text-sm leading-6 text-[color:var(--color-foreground)]"
                        key={suggestion}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {turns.map((turn) => (
                  <article
                    className={cn(
                      "flex",
                      turn.role === "user" ? "justify-end" : "justify-start",
                    )}
                    key={turn.id}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] rounded-[28px] px-4 py-4 shadow-sm sm:px-5",
                        turn.role === "user"
                          ? "bg-[color:var(--color-brand)] text-white"
                          : "border border-[color:var(--color-border)] bg-surface-muted text-[color:var(--color-foreground)]",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            turn.role === "user"
                              ? "border border-white/25 bg-white/15 text-white"
                              : undefined
                          }
                          tone={turn.role === "assistant" ? "accent" : "neutral"}
                        >
                          {turn.role === "assistant" ? "AI" : "你"}
                        </Badge>
                        {turn.role === "assistant" && turn.answer_mode ? (
                          <Badge tone={toneForAnswerMode(turn.answer_mode)}>
                            {labelForAnswerMode(turn.answer_mode)}
                          </Badge>
                        ) : null}
                        <span
                          className={cn(
                            "text-xs",
                            turn.role === "user" ? "text-white/75" : "text-[color:var(--color-muted-foreground)]",
                          )}
                        >
                          {formatDateTimeLabel(turn.created_at)}
                        </span>
                      </div>

                      {turn.role === "assistant" ? (
                        <SafeMarkdown
                          className="mt-3"
                          content={turn.content}
                        />
                      ) : (
                        <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-white">
                          {turn.content}
                        </div>
                      )}

                      {renderAssistantExtras(turn)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[color:var(--color-border)] bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <QaAskForm
            hasTurns={turns.length > 0}
            initialQuery={activeSession ? "" : initialQuery}
            promptSuggestions={turns.length === 0 ? promptSuggestions : []}
            sessionId={activeSession?.aiSession.id}
          />
        </div>
      </section>
    </div>
  );
}
