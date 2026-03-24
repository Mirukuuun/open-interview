import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { interviewBrowseService } from "@/server/services/interview-browse-service";

type InterviewDetailWorkbenchProps = {
  interview: NonNullable<
    ReturnType<typeof interviewBrowseService.getInterviewDetail>
  >;
};

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function renderTagList(tags: string[]) {
  if (tags.length === 0) {
    return <span className="text-sm text-text-muted">No tags</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag}>{tag}</Badge>
      ))}
    </div>
  );
}

export function InterviewDetailWorkbench({
  interview,
}: InterviewDetailWorkbenchProps) {
  const titleParts = [
    interview.company ?? "Unknown company",
    interview.role ?? "Unknown role",
    interview.roundInfo ?? "Unknown round",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/interviews">Back to interviews</Button>
            <Button href="/questions" variant="primary">
              Browse questions
            </Button>
          </>
        }
        description="This route keeps the grouped source context intact: interview metadata, linked canonical questions, and the raw source text."
        routeLabel={`/interviews/${interview.id}`}
        title={titleParts.join(" / ")}
      />

      <div className="flex flex-wrap gap-2">{renderTagList(interview.tags)}</div>

      <DetailGrid
        items={[
          { label: "source_title", value: interview.sourceDocument.title },
          { label: "question_count", value: String(interview.questionCount) },
          { label: "source_kind", value: interview.sourceDocument.kind },
          { label: "updated_at", value: formatDateTime(interview.updatedAt) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="Summary keeps the source-level takeaways visible before drilling into question links."
              title="Interview summary"
            />
            <div className="rounded-xl border border-border-muted bg-surface-muted p-4 text-sm leading-7 text-text-strong whitespace-pre-wrap">
              {interview.summary ?? "No interview summary saved yet."}
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="Linked questions connect the interview source view back to the canonical study bank."
              title={`Linked questions (${interview.questions.length})`}
            />
            {interview.questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-muted">
                No canonical questions have been linked to this interview yet.
              </div>
            ) : (
              <div className="space-y-3">
                {interview.questions.map((question) => (
                  <div
                    className="rounded-xl border border-border-muted bg-surface-muted p-4"
                    key={question.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="text-sm font-semibold text-text-strong hover:text-accent"
                        href={`/questions/${question.id}`}
                      >
                        {question.questionText}
                      </Link>
                      {question.category ? <Badge>{question.category}</Badge> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {question.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                    {question.sourceSnippet ? (
                      <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border-muted bg-white px-3 py-3 text-sm leading-6 text-text-strong">
                        {question.sourceSnippet}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="The original imported source stays visible so study and review stay grounded."
              title="Raw source"
            />
            <div className="max-h-[560px] overflow-auto rounded-xl border border-border-muted bg-surface-muted p-4 font-mono text-sm leading-6 text-text-strong whitespace-pre-wrap">
              {interview.sourceDocument.rawText}
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4" muted>
            <SectionHeading
              description="Operational metadata stays visible while moving between the source view and canonical questions."
              title="Metadata"
            />
            <div className="space-y-3 text-sm text-text-strong">
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                company: {interview.company ?? "unknown"}
              </div>
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                role: {interview.role ?? "unknown"}
              </div>
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                round_info: {interview.roundInfo ?? "unknown"}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="Source document info is grouped separately so the route can be used as a direct-entry source detail page."
              title="Source document"
            />
            <div className="space-y-3 text-sm text-text-strong">
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                <span className="font-medium">Title:</span> {interview.sourceDocument.title}
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                <span className="font-medium">Kind:</span> {interview.sourceDocument.kind}
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                <span className="font-medium">Updated:</span>{" "}
                {formatDateTime(interview.sourceDocument.updatedAt)}
              </div>
              {interview.sourceDocument.fileName ? (
                <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                  <span className="font-medium">File:</span>{" "}
                  {interview.sourceDocument.fileName}
                </div>
              ) : null}
              {interview.sourceDocument.sourceUrl ? (
                <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                  <span className="font-medium">Source URL:</span>{" "}
                  <Link
                    className="text-accent hover:underline"
                    href={interview.sourceDocument.sourceUrl}
                    target="_blank"
                  >
                    {interview.sourceDocument.sourceUrl}
                  </Link>
                </div>
              ) : null}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
