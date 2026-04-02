import Link from "next/link";

import type { ResumeProjectDetail } from "@/server/services/resume-service";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { formatDateTimeLabel } from "@/lib/date-time";

import { StartDeepDiveSessionButton } from "./start-deep-dive-session-button";

export function ProjectWorkbench({ project }: { project: ResumeProjectDetail }) {
  const latestSession = project.sessions[0];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href={`/resume/${project.resume_document.id}`}>返回简历</Button>
            {latestSession ? (
              <Button href={`/resume/projects/${project.id}/session/${latestSession.id}`}>
                打开最新会话
              </Button>
            ) : null}
            <StartDeepDiveSessionButton projectId={project.id} />
          </>
        }
        routeLabel={`/resume/projects/${project.id}`}
        title={project.name}
      />

      <DetailGrid
        items={[
          { label: "项目 ID", value: project.id },
          { label: "会话数", value: `${project.sessions.length}` },
          { label: "亮点数", value: `${project.highlights.length}` },
          { label: "技术栈", value: `${project.tech_stack.length}` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <SectionHeading title="项目上下文" />
            <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4 text-sm leading-6 text-text-muted">
              {project.summary ?? "还没有项目摘要。"}
            </div>

            <div className="space-y-3">
              <SectionHeading
                title="项目亮点"
              />
              {project.highlights.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm text-text-muted">
                  还没有提取到亮点。
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
                title="建议追问"
              />
              {project.deep_dive_questions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm text-text-muted">
                  还没有建议追问。
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
            <SectionHeading title="技术栈" />
            {project.tech_stack.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm text-text-muted">
                还没有提取到技术栈。
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
            <SectionHeading title="会话历史" />
            {project.sessions.length === 0 ? (
              <EmptyList title="还没有会话" />
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
                        {session.title ?? "未命名深挖"}
                      </p>
                      <Badge>{session.status}</Badge>
                    </div>
                    <p className="mt-3 text-xs text-text-muted">
                      更新于 {formatDateTimeLabel(session.updated_at)}
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
