import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

export function QaPlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/qa/session_demo_grounded">Open sample session</Button>
            <Button variant="primary">Ask grounded question</Button>
          </>
        }
        description="AI Review is a grounded study surface, not a generic chat shell. Slice 0 only locks in the three-region layout and route boundaries."
        routeLabel="/qa"
        title="Grounded AI review workspace"
      />

      <DetailGrid
        items={[
          { label: "Layout", value: "Query bar, answer area, right rail, dev trace" },
          { label: "Must show", value: "Answer, citations, related questions, retrieval status" },
          { label: "Session flow", value: "Reloadable detail route" },
          { label: "Current state", value: "No provider wired" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="The main area is reserved for grounded answers and visible citations rather than an undifferentiated chat transcript."
            title="Answer area"
          />
          <EmptyList
            bullets={[
              "Answers must remain visibly connected to local grounding.",
              "Citations and uncertainty messaging should render inline with the answer.",
              "The bottom panel will expose retrieval trace or strategy in development mode.",
            ]}
            description="Slice 5 will wire retrieval and grounded answer generation. The shell here exists to avoid drifting into a generic chatbot layout later."
            title="Grounded answer placeholder"
          />
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading
            description="The right rail keeps related questions and session navigation accessible without hiding the main answer."
            title="Right rail"
          />
          <div className="space-y-3 text-sm text-text-muted">
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Related questions placeholder
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Session history placeholder
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Quick jump links placeholder
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
