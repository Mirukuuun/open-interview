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
              <Button href={`/qa/${newestSession.id}`}>Open latest session</Button>
            ) : null}
            <Button href="/questions" variant="primary">
              Browse question bank
            </Button>
          </>
        }
        description="Ask grounded questions against the local interview bank. Every answer must land with citations, related items, and a visible retrieval trace."
        routeLabel="/qa"
        title="AI Review"
      />

      <DetailGrid
        items={[
          { label: "active_questions", value: `${overview.activeQuestionCount}` },
          { label: "active_sessions", value: `${overview.activeSessionCount}` },
          { label: "persisted_chunks", value: `${overview.totalChunkCount}` },
          {
            label: "chunk_mix",
            value: `${overview.questionChunkCount}/${overview.answerChunkCount}/${overview.sourceExcerptChunkCount}`,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="The ask surface stays grounded by default. The first successful ask creates a reloadable QA session."
            title="Ask a grounded question"
          />
          <QaAskForm initialQuery={initialQuery} mode="new" />
          <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4 text-sm leading-6 text-text-muted">
            Hybrid in Slice 5 means question FTS plus structured tag/source
            recall over persisted local chunks. Embeddings remain deferred.
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4" muted>
            <SectionHeading
              description="Recent grounded sessions stay directly reloadable from the workbench."
              title="Recent sessions"
            />
            {recentSessions.length === 0 ? (
              <EmptyList
                bullets={[
                  "Create a session by asking your first grounded question.",
                  "Session detail pages will preserve turns, citations, and retrieval trace.",
                ]}
                description="No QA sessions have been created yet."
                title="No sessions yet"
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
                        {session.title ?? "Untitled QA session"}
                      </p>
                      <Badge>{session.status}</Badge>
                    </div>
                    {session.latestUserQuery ? (
                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        {session.latestUserQuery}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        Session exists but has no turns yet.
                      </p>
                    )}
                    <p className="mt-3 text-xs text-text-muted">
                      {session.turnCount} turns • updated {formatDateTime(session.updatedAt)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="Developer-facing visibility is part of the product contract for grounded QA."
              title="Trace contract"
            />
            <div className="space-y-3 text-sm text-text-muted">
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                Every assistant turn stores `retrieval_log` plus citation JSON.
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                Source excerpts, question chunks, and answer chunks are persisted locally.
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                `/qa/:sessionId` exposes the selected hits, strategy notes, and related items.
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
