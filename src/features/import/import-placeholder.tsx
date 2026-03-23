import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

const importModes = [
  {
    title: "Upload",
    description: "Attach a file source, capture `kind`, and queue follow-up parsing.",
  },
  {
    title: "Paste Text",
    description: "Create a raw source from copied interview notes or knowledge text.",
  },
  {
    title: "Manual Q&A",
    description: "Insert one reviewed question-answer pair without a parse step.",
  },
];

export function ImportPlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button variant="primary">Save source</Button>
            <Button>Create parse job</Button>
          </>
        }
        description="The import surface is the operational front door: ingest raw notes, show recent source activity, and point users toward the review queue without leaving the page."
        routeLabel="/import"
        title="Import sources into the workbench"
      />

      <DetailGrid
        items={[
          { label: "Default landing", value: "Import" },
          { label: "Modes", value: "Upload, Paste Text, Manual Q&A" },
          { label: "Next slice", value: "Slice 2 import flow" },
          { label: "Recent activity", value: "Stubbed" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.9fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="The left column will host the active import mode and its form state. Slice 0 keeps the structure visible without persistence."
            title="Import methods"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {importModes.map((mode) => (
              <div
                className="rounded-xl border border-border-muted bg-surface-muted p-4"
                key={mode.title}
              >
                <p className="text-sm font-semibold text-text-strong">{mode.title}</p>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {mode.description}
                </p>
              </div>
            ))}
          </div>
          <EmptyList
            bullets={[
              "Capture `kind`, optional title, raw text or file metadata, and optional source URL.",
              "Keep the parse action adjacent so users can move directly into review.",
              "Expose recent sources and jobs in the same workspace to shorten the loop.",
            ]}
            description="No source creation logic is wired yet. This panel exists to lock in the route, columns, and intended operator workflow before Slice 2 starts wiring real forms and storage."
            title="Import workbench is scaffolded, not connected"
          />
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading
            description="The right column stays operational: latest sources, latest parse jobs, and direct links into review."
            title="Recent sources and jobs"
          />
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-border-strong bg-white p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                Latest sources
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Empty bootstrap state. Slice 2 will render the most recent
                `source_document` records here.
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-border-strong bg-white p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                Latest parse jobs
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Parse job status will appear here once the async workflow lands.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
