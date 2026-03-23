import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

type InterviewDetailPlaceholderProps = {
  interviewId: string;
};

export function InterviewDetailPlaceholder({
  interviewId,
}: InterviewDetailPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/interviews">Back to interviews</Button>
            <Button variant="primary">Ask AI about this interview</Button>
          </>
        }
        description="The interview detail route will hold full source context: summary, linked questions, and raw snippets. Slice 0 preserves the route shape only."
        routeLabel={`/interviews/${interviewId}`}
        title="Interview source detail"
      />

      <DetailGrid
        items={[
          { label: "interview_id", value: interviewId },
          { label: "Sections", value: "Header, summary, linked questions, source snippets" },
          { label: "Actions", value: "Jump to question, open source, ask AI" },
          { label: "Status", value: "Stubbed" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="A single route should be enough to understand the source and jump to canonical questions."
            title="Interview context"
          />
          <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-5 text-sm leading-6 text-text-muted">
            Summary, round information, linked questions, and source snippets will
            render here once interview records exist.
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading
            description="Metadata stays visible while reviewing or jumping to question detail."
            title="Metadata"
          />
          <div className="space-y-3 text-sm text-text-muted">
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Company placeholder
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Role placeholder
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Tags placeholder
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
