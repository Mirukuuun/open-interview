import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

type ProjectPlaceholderProps = {
  projectId: string;
};

export function ProjectPlaceholder({ projectId }: ProjectPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/resume">Back to resume</Button>
            <Button href={`/resume/projects/${projectId}/session/session_demo_project`}>
              Open sample session
            </Button>
            <Button variant="primary">Start deep-dive session</Button>
          </>
        }
        title="Resume project detail"
      />

      <DetailGrid
        items={[
          { label: "project_id", value: projectId },
          { label: "Sections", value: "Summary, highlights, stack, questions, sessions" },
          { label: "Actions", value: "Start deep dive or mock interview" },
          { label: "Current state", value: "Scaffold only" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading title="Project context" />
          <div className="space-y-3">
            {[
              "Project summary placeholder",
              "Highlights placeholder",
              "Tech stack placeholder",
              "Suggested deep-dive questions placeholder",
            ].map((item) => (
              <div
                className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-muted"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading title="Session history" />
          <div className="rounded-xl border border-border-strong bg-white p-4 text-sm leading-6 text-text-muted">
            Existing deep-dive and mock interview sessions will render here when
            Slice 6 wires project records.
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
