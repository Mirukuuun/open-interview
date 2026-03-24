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
            <Button href="/resume">返回简历页</Button>
            {firstProject ? (
              <Button href={`/resume/projects/${firstProject.id}`} variant="primary">
                打开首个项目
              </Button>
            ) : null}
          </>
        }
        description="查看一份结构化简历及其提取项目。"
        routeLabel={`/resume/${detail.resumeDocument.id}`}
        title={detail.resumeDocument.candidate_name ?? "结构化简历"}
      />

      <DetailGrid
        items={[
          { label: "简历 ID", value: detail.resumeDocument.id },
          { label: "项目数", value: `${detail.projects.length}` },
          { label: "来源 ID", value: detail.sourceDocument.id },
          { label: "解析状态", value: detail.sourceDocument.parseStatus },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            title="简历摘要"
          />
          <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4 text-sm leading-6 text-text-muted">
            {detail.resumeDocument.summary ?? "还没有简历摘要。"}
          </div>

          {detail.projects.length === 0 ? (
            <EmptyList
              bullets={[
                "如果项目区块不清晰，可以回到 /resume 重新解析。",
                "当前只有简历记录，还没有项目实体。",
              ]}
              description="这份简历还没有提取到项目。"
              title="没有项目"
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
                </Link>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading title="来源信息" />
          <div className="space-y-3 text-sm text-text-muted">
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              <p className="font-semibold text-text-strong">{detail.sourceDocument.title}</p>
              <p className="mt-2 font-mono text-xs">{detail.sourceDocument.id}</p>
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              解析状态: {detail.sourceDocument.parseStatus}
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              更新时间: {formatDateTime(detail.sourceDocument.updatedAt)}
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
