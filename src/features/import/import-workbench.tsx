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
      return "Interview";
    case "knowledge_note":
      return "Knowledge note";
    case "resume":
      return "Resume";
    case "manual_input":
      return "Manual input";
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
      return { label: "Ready for parse", tone: "accent" };
    case "pending":
      return { label: "Pending", tone: "warning" };
    case "running":
      return { label: "Running", tone: "warning" };
    case "needs_review":
      return { label: "Needs review", tone: "warning" };
    case "confirmed":
      return { label: "Confirmed", tone: "success" };
    case "failed":
      return { label: "Failed", tone: "warning" };
    default:
      return { label: parseStatus, tone: "neutral" };
  }
}

export function ImportWorkbench({
  recentSources,
  totalSources,
}: ImportWorkbenchProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/review" variant="primary">
              Open Review Queue
            </Button>
            <Button href="/questions">Open Question Bank</Button>
          </>
        }
        description="Import is now live for pasted text and direct manual Q&A. Save raw sources, keep a visible recent-feed, and hand operators toward the review desk without leaving the workbench."
        routeLabel="/import"
        title="Import sources into the workbench"
      />

      <DetailGrid
        items={[
          { label: "Live now", value: "Paste Text, Manual Q&A" },
          { label: "Upload lane", value: "Deferred in-place" },
          { label: "Recent feed", value: `${recentSources.length} visible` },
          { label: "Next handoff", value: "Review Queue" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.88fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="Choose the fastest ingestion path for the material you have right now. Paste Text writes raw source truth. Manual Q&A writes a canonical question plus a confirmed source backbone."
            title="Import methods"
          />
          <ImportActionsPanel />
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard muted className="space-y-5">
            <SectionHeading
              description="Keep the parse/review handoff explicit. Raw pasted sources land with `not_started`, while manual Q&A skips parsing and lands directly in canonical storage."
              title="Review handoff"
            />
            <div className="rounded-xl border border-border-strong bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">Next step</Badge>
                    <span className="font-mono text-xs text-text-muted">/review</span>
                  </div>
                  <p className="text-sm font-semibold text-text-strong">
                    Use Review Queue after saving pasted text.
                  </p>
                </div>
                <Button href="/review" variant="primary">
                  Open Review Queue
                </Button>
              </div>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Slice 2 stops at source creation and canonical manual entry. Parse job
                creation and review confirmation stay in Slice 3, but the route is
                already linked here so operators know where the next step lives.
              </p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-5">
            <SectionHeading
              description="The recent source feed is live and updates after every successful save on this page."
              title={`Recent sources (${totalSources})`}
            />

            {recentSources.length === 0 ? (
              <EmptyList
                bullets={[
                  "Paste interview notes, knowledge text, or resume content into the raw source lane.",
                  "Use Manual Q&A when you already know the canonical question and answer.",
                  "Open Review Queue after saving a pasted source to continue the parse/review loop later.",
                ]}
                description="No source_document records exist yet. The import page is ready; create the first item from the left-side panel and it will appear here immediately."
                title="No imported sources yet"
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
                            source_url: {source.sourceUrl}
                          </span>
                        ) : null}
                        {source.kind === "manual_input" ? (
                          <Button href="/questions" variant="ghost">
                            Open Question Bank
                          </Button>
                        ) : (
                          <Button href="/review" variant="ghost">
                            Open Review Queue
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
