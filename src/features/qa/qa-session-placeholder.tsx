import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

type QaSessionPlaceholderProps = {
  sessionId: string;
};

export function QaSessionPlaceholder({
  sessionId,
}: QaSessionPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/qa">Back to QA</Button>
            <Button variant="primary">Continue session</Button>
          </>
        }
        description="Session detail routes preserve turn history, the newest grounded answer, and citations per turn. The route is live now so future QA work can remain reloadable."
        routeLabel={`/qa/${sessionId}`}
        title="AI review session"
      />

      <DetailGrid
        items={[
          { label: "session_id", value: sessionId },
          { label: "Sections", value: "Header, turns, citations, retrieval trace" },
          { label: "Continuation", value: "Required" },
          { label: "Provider", value: "Stubbed" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="Turn history and the latest grounded answer will render in this region."
            title="Session transcript"
          />
          <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-5 text-sm leading-6 text-text-muted">
            Session turns, citations, and answer blocks are deferred until the
            QA slice wires retrieval and generation.
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading
            description="Trace and context affordances stay visible without turning the page into a chat-first layout."
            title="Trace and context"
          />
          <div className="space-y-3 text-sm text-text-muted">
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Retrieval trace placeholder
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Related questions placeholder
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
