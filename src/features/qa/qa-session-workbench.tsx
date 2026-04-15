import Link from "next/link";

import type { QaSessionDetail } from "@/server/services/qa-session-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { formatCategoryLabelOrFallback } from "@/lib/taxonomy-display";

import { QaAskForm } from "./qa-ask-form";

type QaSessionWorkbenchProps = {
  detail: QaSessionDetail;
};

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function renderCitations(
  citations: QaSessionWorkbenchProps["detail"]["turns"][number]["citations"],
) {
  if (citations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted px-4 py-4 text-sm text-text-muted">
        No citations stored for this turn.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {citations.map((citation) => (
        <div
          className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4"
          key={`${citation.owner_id}-${citation.label}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{citation.owner_type}</Badge>
            <Link
              className="text-sm font-semibold text-text-strong hover:text-accent"
              href={citation.href}
            >
              {citation.label}
            </Link>
          </div>
          {citation.snippet ? (
            <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border-muted bg-white px-3 py-3 text-sm leading-6 text-text-strong">
              {citation.snippet}
            </div>
          ) : null}
          {citation.source_document ? (
            <p className="mt-3 text-sm text-text-muted">
              Source:{" "}
              {citation.source_document.href ? (
                <Link
                  className="font-medium text-accent hover:underline"
                  href={citation.source_document.href}
                >
                  {citation.source_document.title}
                </Link>
              ) : (
                <span className="font-medium text-text-strong">
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

function renderTrace(
  retrievalLog: QaSessionWorkbenchProps["detail"]["turns"][number]["retrieval_log"],
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

export function QaSessionWorkbench({ detail }: QaSessionWorkbenchProps) {
  const assistantTurns = detail.turns.filter((turn) => turn.role === "assistant");
  const latestAssistantTurn = assistantTurns.at(-1);
  const citationCount = assistantTurns.reduce(
    (total, turn) => total + turn.citations.length,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/qa">返回 QA</Button>
            {latestAssistantTurn?.citations[0] ? (
              <Button href={latestAssistantTurn.citations[0].href} variant="primary">
                打开首条引用
              </Button>
            ) : null}
          </>
        }
        title={detail.aiSession.title ?? "QA 会话"}
      />

      <DetailGrid
        items={[
          { label: "session_id", value: detail.aiSession.id },
          { label: "status", value: detail.aiSession.status },
          { label: "turns", value: `${detail.turns.length}` },
          { label: "citations", value: `${citationCount}` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <SectionHeading title="Continue session" />
            <QaAskForm mode="existing" sessionId={detail.aiSession.id} />
          </SurfaceCard>

          <SurfaceCard className="space-y-5">
            <SectionHeading title="Session transcript" />
            {detail.turns.length === 0 ? (
              <EmptyList title="No turns" />
            ) : (
              <div className="space-y-4">
                {detail.turns.map((turn) => (
                  <div
                    className="rounded-2xl border border-border-muted bg-surface-muted px-4 py-4"
                    key={turn.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={turn.role === "assistant" ? "accent" : "neutral"}>
                        {turn.role}
                      </Badge>
                      <span className="font-mono text-xs text-text-muted">
                        {formatDateTime(turn.created_at)}
                      </span>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-strong">
                      {turn.content}
                    </div>

                    {turn.role === "assistant" ? (
                      <div className="mt-5 space-y-5">
                        <div className="space-y-3">
                          <SectionHeading title={`Citations (${turn.citations.length})`} />
                          {renderCitations(turn.citations)}
                        </div>
                        {renderTrace(turn.retrieval_log)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4" muted>
            <SectionHeading title="Related questions" />
            {latestAssistantTurn?.related_questions.length ? (
              <div className="space-y-3">
                {latestAssistantTurn.related_questions.map((question) => (
                  <Link
                    className="interactive-card block rounded-xl border border-border-strong bg-white px-4 py-4 focus-visible:outline-none"
                    href={`/questions/${question.id}`}
                    key={question.id}
                  >
                    <p className="text-sm font-semibold text-text-strong">
                      {question.question_text}
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      {formatCategoryLabelOrFallback(question.category)} • {question.source_count} source(s)
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm text-text-muted">
                No related questions were stored for the latest assistant turn.
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading title="Latest retrieval summary" />
            {latestAssistantTurn?.retrieval_log ? (
              <div className="space-y-3 text-sm text-text-strong">
                <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                  strategy: {latestAssistantTurn.retrieval_log.strategy}
                </div>
                <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                  question_ids:{" "}
                  {latestAssistantTurn.retrieval_log.final_context.question_ids.length}
                </div>
                <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                  chunk_ids: {latestAssistantTurn.retrieval_log.final_context.chunk_ids.length}
                </div>
                <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                  created_at: {formatDateTime(latestAssistantTurn.retrieval_log.created_at)}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted px-4 py-4 text-sm text-text-muted">
                No retrieval trace is available yet.
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
