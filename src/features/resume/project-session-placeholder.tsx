import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

type ProjectSessionPlaceholderProps = {
  projectId: string;
  sessionId: string;
};

export function ProjectSessionPlaceholder({
  projectId,
  sessionId,
}: ProjectSessionPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href={`/resume/projects/${projectId}`}>Back to project</Button>
            <Button variant="primary">Submit answer</Button>
          </>
        }
        title="Project deep-dive session"
      />

      <DetailGrid
        items={[
          { label: "project_id", value: projectId },
          { label: "session_id", value: sessionId },
          { label: "Layout", value: "Transcript + project context panel" },
          { label: "Status", value: "Stubbed" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading title="Session transcript" />
          <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-5 text-sm leading-6 text-text-muted">
            Conversation turns are deferred. This route exists now to keep the
            project-session URL and page layout stable.
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading title="Project context" />
          <div className="space-y-3 text-sm text-text-muted">
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Summary placeholder
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Highlights placeholder
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Tech stack placeholder
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
