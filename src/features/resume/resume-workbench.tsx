import Link from "next/link";

import type { ResumeWorkspace } from "@/server/services/resume-service";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

import { ResumeSourcePanel } from "./resume-source-panel";

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

export function ResumeWorkbench({ workspace }: { workspace: ResumeWorkspace }) {
  const newestResume = workspace.activeResume;
  const firstProject = newestResume?.projects[0];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            {newestResume ? (
              <Button href={`/resume/${newestResume.resumeDocument.id}`}>
                Open structured resume
              </Button>
            ) : null}
            {firstProject ? (
              <Button href={`/resume/projects/${firstProject.id}`} variant="primary">
                Open first project
              </Button>
            ) : null}
          </>
        }
        description="Paste a resume source, extract structured projects, and move directly into project-focused deep dives without collapsing the flow into generic chat."
        routeLabel="/resume"
        title="Resume / Projects"
      />

      <DetailGrid
        items={[
          { label: "resume_sources", value: workspace.latestResumeSource ? "1" : "0" },
          { label: "structured_resumes", value: `${workspace.recentResumes.length}` },
          {
            label: "parsed_preview_projects",
            value: `${workspace.parsedProjectPreview.length}`,
          },
          {
            label: "active_projects",
            value: `${workspace.activeResume?.projects.length ?? 0}`,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="Keep the resume source, parse state, and structured-import action in one place."
            title="Resume source"
          />
          <ResumeSourcePanel
            latestParseJob={workspace.latestParseJob}
            latestSource={workspace.latestResumeSource}
            parseWarnings={workspace.parseWarnings}
            parsedProjectPreview={workspace.parsedProjectPreview}
          />
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <SectionHeading
              description="Structured projects are the entry point for deep-dive storytelling."
              title="Project list"
            />
            {!newestResume || newestResume.projects.length === 0 ? (
              <EmptyList
                bullets={[
                  "Save a resume source and run parse.",
                  "Persist the structured preview into resume/project entities.",
                  "Open a project detail to start the deep-dive flow.",
                ]}
                description="No structured projects are available yet."
                title="No projects yet"
              />
            ) : (
              <div className="space-y-3">
                {newestResume.projects.map((project) => (
                  <Link
                    className="block rounded-xl border border-border-strong bg-white px-4 py-4 transition-colors hover:border-accent hover:bg-accent-soft/30"
                    href={`/resume/projects/${project.id}`}
                    key={project.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text-strong">{project.name}</p>
                      <Badge>{`${project.session_count} session(s)`}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {project.summary ?? "No summary extracted."}
                    </p>
                    {project.tech_stack.length > 0 ? (
                      <p className="mt-3 text-xs text-text-muted">
                        stack: {project.tech_stack.join(", ")}
                      </p>
                    ) : null}
                    {project.latest_session_updated_at ? (
                      <p className="mt-3 text-xs text-text-muted">
                        latest session {formatDateTime(project.latest_session_updated_at)}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4" muted>
            <SectionHeading
              description="Direct-entry resume routes stay stable even when only one active resume exists."
              title="Recent structured resumes"
            />
            {workspace.recentResumes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm text-text-muted">
                No structured resume has been persisted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {workspace.recentResumes.map((resume) => (
                  <Link
                    className="block rounded-xl border border-border-strong bg-white px-4 py-4 transition-colors hover:border-accent hover:bg-accent-soft/30"
                    href={`/resume/${resume.id}`}
                    key={resume.id}
                  >
                    <p className="text-sm font-semibold text-text-strong">
                      {resume.candidate_name ?? resume.id}
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      {resume.project_count} project(s) • updated{" "}
                      {formatDateTime(resume.updated_at)}
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
