import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

type ResumeDetailPlaceholderProps = {
  resumeId: string;
};

export function ResumeDetailPlaceholder({
  resumeId,
}: ResumeDetailPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/resume">Back to resumes</Button>
            <Button variant="primary">View extracted projects</Button>
          </>
        }
        title="Resume detail"
      />

      <DetailGrid
        items={[
          { label: "resume_id", value: resumeId },
          { label: "Sections", value: "Source status, summary, projects" },
          { label: "Actions", value: "Parse, inspect projects" },
          { label: "Status", value: "Stubbed" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading title="Resume summary" />
          <div className="rounded-xl border border-dashed border-[color:var(--color-border)] bg-surface-muted p-5 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
            Resume metadata, parse status, and extracted projects are intentionally
            deferred to Slice 6.
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading title="Resume metadata" />
          <div className="space-y-3 text-sm text-[color:var(--color-muted-foreground)]">
            <div className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3">
              Candidate name placeholder
            </div>
            <div className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3">
              Parse status placeholder
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
