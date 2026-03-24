import Link from "next/link";

import type { ResumeDetail } from "@/server/services/resume-service";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

export function ResumeDetailWorkbench({ detail }: { detail: ResumeDetail }) {
  const firstProject = detail.projects[0];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/resume">Back to resume hub</Button>
            {firstProject ? (
              <Button href={`/resume/projects/${firstProject.id}`} variant="primary">
                Open first project
              </Button>
            ) : null}
          </>
        }
        description="Inspect one structured resume document, its linked source, and the extracted projects that drive deep-dive practice."
        routeLabel={`/resume/${detail.resumeDocument.id}`}
        title={detail.resumeDocument.candidate_name ?? "Structured resume"}
      />

      <DetailGrid
        items={[
          { label: "resume_id", value: detail.resumeDocument.id },
          { label: "projects", value: `${detail.projects.length}` },
          { label: "source_id", value: detail.sourceDocument.id },
          { label: "parse_status", value: detail.sourceDocument.parseStatus },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="The summary stays close to the extracted projects so the user can move from overview into project detail quickly."
            title="Resume summary"
          />
          <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4 text-sm leading-6 text-text-muted">
            {detail.resumeDocument.summary ?? "No summary was captured for this resume."}
          </div>

          {detail.projects.length === 0 ? (
            <EmptyList
              bullets={[
                "Return to /resume and rerun parse if the project section was unclear.",
                "Structured resume rows exist, but there are no project entities yet.",
              ]}
              description="This resume has no extracted projects."
              title="No projects"
            />
          ) : (
            <div className="space-y-3">
              {detail.projects.map((project) => (
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
                </Link>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading
            description="Source linkage remains visible so structured resume data never floats free from its raw origin."
            title="Source metadata"
          />
          <div className="space-y-3 text-sm text-text-muted">
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              <p className="font-semibold text-text-strong">{detail.sourceDocument.title}</p>
              <p className="mt-2 font-mono text-xs">{detail.sourceDocument.id}</p>
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              parse status: {detail.sourceDocument.parseStatus}
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              updated: {formatDateTime(detail.sourceDocument.updatedAt)}
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
