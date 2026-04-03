import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

type ReviewJobPlaceholderProps = {
  jobId: string;
};

export function ReviewJobPlaceholder({ jobId }: ReviewJobPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/review">Back to queue</Button>
            <Button variant="primary">Confirm import</Button>
          </>
        }
        routeLabel={`/review/${jobId}`}
        title="Review parsed candidates before writing canonical data"
      />

      <DetailGrid
        items={[
          { label: "job_id", value: jobId },
          { label: "expected status", value: "needs_review" },
          { label: "columns", value: "Source, candidates, merge preview" },
          { label: "batch action", value: "Confirm import" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <SurfaceCard className="space-y-4">
          <SectionHeading title="Source context" />
          <EmptyList
            bullets={[
              "Source metadata, summary, and raw text or snippet viewer belong here.",
              "The reviewer should never lose sight of the original material while editing candidates.",
              "This space will also show extracted interview metadata once parse results exist.",
            ]}
            description="No job payload is loaded in Slice 0. The structure exists so Slice 3 can plug in parse results without reworking the layout."
            title="Source snapshot placeholder"
          />
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <SectionHeading title="Candidate decisions" />
          <div className="space-y-3">
            {["Candidate 1", "Candidate 2"].map((candidate) => (
              <div
                className="rounded-xl border border-border-muted bg-surface-muted p-4"
                key={candidate}
              >
                <p className="text-sm font-semibold text-text-strong">{candidate}</p>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Editable fields for question text, canonical answer, category,
                  tags, confidence, and merge target will render here.
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <SectionHeading title="Import preview" />
          <EmptyList
            bullets={[
              "Show existing canonical question context when merge hints are available.",
              "Keep created, merged, and skipped counts visible before final confirmation.",
              "Avoid modal-per-candidate confirmation; batch review is the core workflow.",
            ]}
            description="The preview remains static until parse-job APIs and question search arrive in Slice 3 and Slice 4."
            title="Merge target and summary placeholder"
          />
        </SurfaceCard>
      </div>
    </div>
  );
}
