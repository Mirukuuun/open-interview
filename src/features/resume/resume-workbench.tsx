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
                打开结构化简历
              </Button>
            ) : null}
            {firstProject ? (
              <Button href={`/resume/projects/${firstProject.id}`} variant="primary">
                打开首个项目
              </Button>
            ) : null}
          </>
        }
        description="导入简历、提取项目，并进入项目深挖。"
        routeLabel="/resume"
        title="简历 / 项目"
      />

      <DetailGrid
        items={[
          { label: "简历来源", value: workspace.latestResumeSource ? "1" : "0" },
          { label: "结构化简历", value: `${workspace.recentResumes.length}` },
          {
            label: "预览项目",
            value: `${workspace.parsedProjectPreview.length}`,
          },
          {
            label: "当前项目",
            value: `${workspace.activeResume?.projects.length ?? 0}`,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading title="简历来源" />
          <ResumeSourcePanel
            latestParseJob={workspace.latestParseJob}
            latestSource={workspace.latestResumeSource}
            parseWarnings={workspace.parseWarnings}
            parsedProjectPreview={workspace.parsedProjectPreview}
          />
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <SectionHeading title="项目列表" />
            {!newestResume || newestResume.projects.length === 0 ? (
              <EmptyList
                bullets={[
                  "先保存简历来源并执行解析。",
                  "再把预览结果写入简历和项目实体。",
                  "然后进入项目详情开始深挖。",
                ]}
                description="还没有结构化项目。"
                title="还没有项目"
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
                      <Badge>{`${project.session_count} 个会话`}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {project.summary ?? "还没有项目摘要。"}
                    </p>
                    {project.tech_stack.length > 0 ? (
                      <p className="mt-3 text-xs text-text-muted">
                        技术栈: {project.tech_stack.join(", ")}
                      </p>
                    ) : null}
                    {project.latest_session_updated_at ? (
                      <p className="mt-3 text-xs text-text-muted">
                        最近会话: {formatDateTime(project.latest_session_updated_at)}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4" muted>
            <SectionHeading title="最近结构化简历" />
            {workspace.recentResumes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm text-text-muted">
                还没有持久化的结构化简历。
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
                      {resume.project_count} 个项目 • 更新于{" "}
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
