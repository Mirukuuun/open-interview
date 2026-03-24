import Link from "next/link";

import type { ResumeDeepDiveSessionDetail } from "@/server/services/resume-deep-dive-service";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

import { DeepDiveAnswerForm } from "./deep-dive-answer-form";
import { StartDeepDiveSessionButton } from "./start-deep-dive-session-button";

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function renderTrace(
  retrievalLog: ResumeDeepDiveSessionDetail["turns"][number]["retrieval_log"],
) {
  if (!retrievalLog) {
    return null;
  }

  return (
    <details className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4" open>
      <summary className="cursor-pointer text-sm font-semibold text-text-strong">
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
              className="rounded-lg border border-border-muted bg-white px-3 py-3"
              key={`${hit.owner_type}-${hit.owner_id}-${hit.chunk_id ?? "none"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{hit.owner_type}</Badge>
                <Badge tone={hit.reason === "fts" ? "accent" : "success"}>
                  {hit.reason}
                </Badge>
                <span className="font-mono text-xs text-text-muted">
                  score {hit.score.toFixed(1)}
                </span>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-strong">
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
        description="查看深挖对话、提示和检索轨迹。"
        routeLabel={`/resume/projects/${detail.resumeProject.id}/session/${detail.aiSession.id}`}
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
            <SectionHeading
              description="Submit the next project answer while keeping the latest interviewer prompt visible above."
              title="Continue deep dive"
            />
            <DeepDiveAnswerForm
              projectId={detail.resumeProject.id}
              sessionId={detail.aiSession.id}
            />
          </SurfaceCard>

          <SurfaceCard className="space-y-5">
            <SectionHeading
              description="Turns are preserved in order so the project narrative can be reviewed, not just improvised once."
              title="Session transcript"
            />
            {detail.turns.length === 0 ? (
              <EmptyList
                bullets={[
                  "Start a deep-dive session from the project page.",
                  "The first assistant turn will seed the project prompt.",
                ]}
                description="This session has no turns yet."
                title="No turns"
              />
            ) : (
              <div className="space-y-4">
                {detail.turns.map((turn) => (
                  <div
                    className="rounded-2xl border border-border-muted bg-surface-muted px-4 py-4"
                    key={turn.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={turn.role === "assistant" ? "accent" : "neutral"}>
                        {turn.role === "assistant" ? "interviewer" : turn.role}
                      </Badge>
                      <span className="font-mono text-xs text-text-muted">
                        {formatDateTime(turn.created_at)}
                      </span>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-strong">
                      {turn.content}
                    </div>

                    {turn.role === "assistant" && turn.coach_hints.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        <SectionHeading
                          description="Hints stay explicit so the session remains a workbench, not a mystery box."
                          title={`Coach hints (${turn.coach_hints.length})`}
                        />
                        {turn.coach_hints.map((hint) => (
                          <div
                            className="rounded-xl border border-border-muted bg-white px-4 py-4 text-sm leading-6 text-text-strong"
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
                          description="Related question-bank items are optional supporting context, not the main surface."
                          title={`Related questions (${turn.related_questions.length})`}
                        />
                        <div className="space-y-3">
                          {turn.related_questions.map((question) => (
                            <Link
                              className="block rounded-xl border border-border-muted bg-white px-4 py-4 transition-colors hover:border-accent hover:bg-accent-soft/30"
                              href={`/questions/${question.id}`}
                              key={question.id}
                            >
                              <p className="text-sm font-semibold text-text-strong">
                                {question.question_text}
                              </p>
                              <p className="mt-2 text-sm text-text-muted">
                                {question.category ?? "uncategorized"} • {question.source_count} source(s)
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
          <SurfaceCard className="space-y-4" muted>
            <SectionHeading
              description="Project context stays visible while the conversation evolves."
              title="Project context"
            />
            <div className="rounded-xl border border-border-strong bg-white px-4 py-4 text-sm leading-6 text-text-muted">
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
                    className="rounded-xl border border-border-strong bg-white px-4 py-3 text-sm text-text-strong"
                    key={highlight}
                  >
                    {highlight}
                  </div>
                ))}
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="The latest interviewer question stays easy to revisit before answering."
              title="Latest prompt"
            />
            {latestAssistantTurn ? (
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4 text-sm leading-6 text-text-strong">
                {latestAssistantTurn.content}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted px-4 py-4 text-sm text-text-muted">
                No assistant prompt is available yet.
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
