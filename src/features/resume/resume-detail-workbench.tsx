import Link from "next/link";

import type { ResumeDetail } from "@/server/services/resume-service";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { formatDateTimeLabel } from "@/lib/date-time";

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
          <div className="rounded-xl border border-[color:var(--color-border)] bg-surface-muted px-4 py-4 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
            {detail.resumeDocument.summary ?? "还没有简历摘要。"}
          </div>

          {detail.projects.length === 0 ? (
            <EmptyList title="没有项目" />
          ) : (
            <div className="space-y-3">
              {detail.projects.map((project) => (
                <Link
                  className="block rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-4 hover:border-[color:var(--color-brand)] transition-colors focus-visible:outline-none"
                  href={`/resume/projects/${project.id}`}
                  key={project.id}
                >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[color:var(--color-foreground)]">{project.name}</p>
                    <Badge>{`${project.session_count} 个会话`}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                    {project.summary ?? "还没有项目摘要。"}
                    </p>
                    {project.tech_stack.length > 0 ? (
                      <p className="mt-3 text-xs text-[color:var(--color-muted-foreground)]">
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
          <div className="space-y-3 text-sm text-[color:var(--color-muted-foreground)]">
            <div className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3">
              <p className="font-semibold text-[color:var(--color-foreground)]">{detail.sourceDocument.title}</p>
              <p className="mt-2 font-mono text-xs">{detail.sourceDocument.id}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3">
              解析状态: {detail.sourceDocument.parseStatus}
            </div>
            <div className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3">
              更新时间: {formatDateTimeLabel(detail.sourceDocument.updatedAt)}
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
