import Link from "next/link";

import type { ResumeProjectDetail } from "@/server/services/resume-service";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

import { StartDeepDiveSessionButton } from "./start-deep-dive-session-button";

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

export function ProjectWorkbench({ project }: { project: ResumeProjectDetail }) {
  const latestSession = project.sessions[0];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href={`/resume/${project.resume_document.id}`}>Back to resume</Button>
            {latestSession ? (
              <Button href={`/resume/projects/${project.id}/session/${latestSession.id}`}>
                Open latest session
              </Button>
            ) : null}
            <StartDeepDiveSessionButton projectId={project.id} />
          </>
        }
        description="One project stays anchored as the deep-dive unit: context on the left, session history on the right, and explicit project prompts ready to practice."
        routeLabel={`/resume/projects/${project.id}`}
        title={project.name}
      />

      <DetailGrid
        items={[
          { label: "project_id", value: project.id },
          { label: "sessions", value: `${project.sessions.length}` },
          { label: "highlights", value: `${project.highlights.length}` },
          { label: "tech_stack", value: `${project.tech_stack.length}` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <SectionHeading
              description="Project context stays visible because the deep-dive flow should practice storytelling, not generic chatting."
              title="Project context"
            />
            <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4 text-sm leading-6 text-text-muted">
              {project.summary ?? "No summary extracted for this project."}
            </div>

            <div className="space-y-3">
              <SectionHeading
                description="Highlights give the deep-dive session concrete material to probe."
                title="Highlights"
              />
              {project.highlights.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm text-text-muted">
                  No highlight bullets were extracted.
                </div>
              ) : (
                project.highlights.map((highlight) => (
                  <div
                    className="rounded-xl border border-border-muted bg-white px-4 py-4 text-sm leading-6 text-text-strong"
                    key={highlight}
                  >
                    {highlight}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <SectionHeading
                description="Suggested prompts come from the structured project entity and seed the first session turns."
                title="Suggested deep-dive questions"
              />
              {project.deep_dive_questions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm text-text-muted">
                  No suggested questions were extracted.
                </div>
              ) : (
                project.deep_dive_questions.map((question) => (
                  <div
                    className="rounded-xl border border-border-muted bg-white px-4 py-4 text-sm leading-6 text-text-strong"
                    key={question}
                  >
                    {question}
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4" muted>
            <SectionHeading
              description="The stack is visible before the user starts answering follow-ups."
              title="Tech stack"
            />
            {project.tech_stack.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm text-text-muted">
                No stack items were extracted.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.tech_stack.map((tech) => (
                  <Badge key={tech}>{tech}</Badge>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-5">
            <SectionHeading
              description="Session history stays beside the project, not hidden behind the generic QA route."
              title="Session history"
            />
            {project.sessions.length === 0 ? (
              <EmptyList
                bullets={[
                  "Start a deep-dive session from this page.",
                  "The first turn will seed from the project's suggested questions.",
                ]}
                description="No deep-dive sessions exist for this project yet."
                title="No sessions yet"
              />
            ) : (
              <div className="space-y-3">
                {project.sessions.map((session) => (
                  <Link
                    className="block rounded-xl border border-border-strong bg-white px-4 py-4 transition-colors hover:border-accent hover:bg-accent-soft/30"
                    href={`/resume/projects/${project.id}/session/${session.id}`}
                    key={session.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text-strong">
                        {session.title ?? "Untitled deep dive"}
                      </p>
                      <Badge>{session.status}</Badge>
                    </div>
                    <p className="mt-3 text-xs text-text-muted">
                      updated {formatDateTime(session.updated_at)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
