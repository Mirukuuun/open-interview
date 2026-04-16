import Link from "next/link";

import type { ResumeDeepDiveSessionDetail } from "@/server/services/resume-deep-dive-service";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { formatDateTimeLabel } from "@/lib/date-time";
import { formatCategoryLabelOrFallback } from "@/lib/taxonomy-display";

import { DeepDiveAnswerForm } from "./deep-dive-answer-form";
import { StartDeepDiveSessionButton } from "./start-deep-dive-session-button";

function renderTrace(
  retrievalLog: ResumeDeepDiveSessionDetail["turns"][number]["retrieval_log"],
) {
  if (!retrievalLog) {
    return null;
  }

  return (
    <details className="rounded-xl border border-[color:var(--color-border)] bg-surface-muted px-4 py-4" open>
      <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-foreground)]">
        Retrieval trace • {retrievalLog.strategy} • {retrievalLog.hits.length} hits
      </summary>
      <div className="mt-4 space-y-4">
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
        <div className="space-y-3">
          {retrievalLog.hits.map((hit) => (
            <div
              className="rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-3"
              key={`${hit.owner_type}-${hit.owner_id}-${hit.chunk_id ?? "none"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{hit.owner_type}</Badge>
                <Badge tone={hit.reason === "fts" ? "accent" : "success"}>
                  {hit.reason}
                </Badge>
                <span className="font-mono text-xs text-[color:var(--color-muted-foreground)]">
                  score {hit.score.toFixed(1)}
                </span>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-foreground)]">
                {hit.snippet}
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

export function ProjectSessionWorkbench({
  detail,
}: {
  detail: ResumeDeepDiveSessionDetail;
}) {
  const latestAssistantTurn = [...detail.turns]
    .reverse()
    .find((turn) => turn.role === "assistant");
  const latestCoachHints = latestAssistantTurn?.coach_hints ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href={`/resume/projects/${detail.resumeProject.id}`}>返回项目</Button>
            <StartDeepDiveSessionButton
              label="新建深挖"
              projectId={detail.resumeProject.id}
            />
          </>
        }
        title={detail.aiSession.title ?? `${detail.resumeProject.name} 深挖`}
      />

      <DetailGrid
        items={[
          { label: "session_id", value: detail.aiSession.id },
          { label: "status", value: detail.aiSession.status },
          { label: "turns", value: `${detail.turns.length}` },
          {
            label: "latest_trace_hits",
            value: `${latestAssistantTurn?.retrieval_log?.hits.length ?? 0}`,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <SectionHeading title="Continue deep dive" />
            <DeepDiveAnswerForm
              projectId={detail.resumeProject.id}
              sessionId={detail.aiSession.id}
            />
          </SurfaceCard>

          <SurfaceCard className="space-y-5">
            <SectionHeading title="Session transcript" />
            {detail.turns.length === 0 ? (
              <EmptyList title="No turns" />
            ) : (
              <div className="space-y-4">
                {detail.turns.map((turn) => (
                  <div
                    className="rounded-2xl border border-[color:var(--color-border)] bg-surface-muted px-4 py-4"
                    key={turn.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={turn.role === "assistant" ? "accent" : "neutral"}>
                        {turn.role === "assistant" ? "interviewer" : turn.role}
                      </Badge>
                      <span className="font-mono text-xs text-[color:var(--color-muted-foreground)]">
                        {formatDateTimeLabel(turn.created_at)}
                      </span>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-foreground)]">
                      {turn.content}
                    </div>

                    {turn.role === "assistant" && turn.coach_hints.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        <SectionHeading title={`Coach hints (${turn.coach_hints.length})`} />
                        {turn.coach_hints.map((hint) => (
                          <div
                            className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-4 text-sm leading-6 text-[color:var(--color-foreground)]"
                            key={hint}
                          >
                            {hint}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {turn.role === "assistant" && turn.related_questions.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        <SectionHeading
                          title={`Related questions (${turn.related_questions.length})`}
                        />
                        <div className="space-y-3">
                          {turn.related_questions.map((question) => (
                            <Link
                              className="block rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-4 hover:border-[color:var(--color-brand)] transition-colors focus-visible:outline-none"
                              href={`/questions/${question.id}`}
                              key={question.id}
                            >
                              <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                                {question.question_text}
                              </p>
                              <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
                                {formatCategoryLabelOrFallback(question.category)} • {question.source_count} source(s)
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {turn.role === "assistant" ? renderTrace(turn.retrieval_log) : null}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <SectionHeading title="当前 coach hints" />
            {latestCoachHints.length > 0 ? (
              <div className="space-y-3">
                {latestCoachHints.map((hint) => (
                  <div
                    className="rounded-xl border border-[color:var(--color-border)] bg-surface-muted px-4 py-4 text-sm leading-6 text-[color:var(--color-foreground)]"
                    key={hint}
                  >
                    {hint}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[color:var(--color-border)] bg-surface-muted px-4 py-4 text-sm text-[color:var(--color-muted-foreground)]">
                当前还没有 coach hints。先完成一轮回答，系统会给出表达和补充建议。
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4" muted>
            <SectionHeading title="Project context" />
            <div className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-4 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
              {detail.resumeProject.summary ?? "No summary extracted."}
            </div>
            {detail.resumeProject.tech_stack.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detail.resumeProject.tech_stack.map((tech) => (
                  <Badge key={tech}>{tech}</Badge>
                ))}
              </div>
            ) : null}
            {detail.resumeProject.highlights.length > 0 ? (
              <div className="space-y-2">
                {detail.resumeProject.highlights.map((highlight) => (
                  <div
                    className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-foreground)]"
                    key={highlight}
                  >
                    {highlight}
                  </div>
                ))}
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading title="建议追问库" />
            {detail.resumeProject.deep_dive_questions.length > 0 ? (
              <div className="space-y-3">
                {detail.resumeProject.deep_dive_questions.map((question) => (
                  <div
                    className="rounded-xl border border-[color:var(--color-border)] bg-surface-muted px-4 py-4 text-sm leading-6 text-[color:var(--color-foreground)]"
                    key={question}
                  >
                    {question}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[color:var(--color-border)] bg-surface-muted px-4 py-4 text-sm text-[color:var(--color-muted-foreground)]">
                这条项目暂时没有预置追问，先从左侧会话继续深挖。
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading title="Latest prompt" />
            {latestAssistantTurn ? (
              <div className="rounded-xl border border-[color:var(--color-border)] bg-surface-muted px-4 py-4 text-sm leading-6 text-[color:var(--color-foreground)]">
                {latestAssistantTurn.content}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[color:var(--color-border)] bg-surface-muted px-4 py-4 text-sm text-[color:var(--color-muted-foreground)]">
                No assistant prompt is available yet.
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
