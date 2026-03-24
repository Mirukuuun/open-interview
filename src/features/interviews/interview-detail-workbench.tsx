import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { interviewBrowseService } from "@/server/services/interview-browse-service";

type InterviewDetailWorkbenchProps = {
  interview: NonNullable<
    ReturnType<typeof interviewBrowseService.getInterviewDetail>
  >;
};

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function renderTagList(tags: string[]) {
  if (tags.length === 0) {
    return <span className="text-sm text-text-muted">无标签</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag}>{tag}</Badge>
      ))}
    </div>
  );
}

export function InterviewDetailWorkbench({
  interview,
}: InterviewDetailWorkbenchProps) {
  const titleParts = [
    interview.company ?? "未知公司",
    interview.role ?? "未知岗位",
    interview.roundInfo ?? "未知轮次",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/interviews">返回面经</Button>
            <Button href="/questions" variant="primary">
              查看题库
            </Button>
          </>
        }
        description="集中查看面经元信息、关联题目和来源原文。"
        routeLabel={`/interviews/${interview.id}`}
        title={titleParts.join(" / ")}
      />

      <div className="flex flex-wrap gap-2">{renderTagList(interview.tags)}</div>

      <DetailGrid
        items={[
          { label: "来源标题", value: interview.sourceDocument.title },
          { label: "题目数", value: String(interview.questionCount) },
          { label: "来源类型", value: interview.sourceDocument.kind },
          { label: "更新时间", value: formatDateTime(interview.updatedAt) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <SectionHeading
              title="面经摘要"
            />
            <div className="rounded-xl border border-border-muted bg-surface-muted p-4 text-sm leading-7 text-text-strong whitespace-pre-wrap">
              {interview.summary ?? "还没有面经摘要。"}
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              title={`关联题目（${interview.questions.length}）`}
            />
            {interview.questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-muted">
                这条面经还没有关联题目。
              </div>
            ) : (
              <div className="space-y-3">
                {interview.questions.map((question) => (
                  <div
                    className="rounded-xl border border-border-muted bg-surface-muted p-4"
                    key={question.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="text-sm font-semibold text-text-strong hover:text-accent"
                        href={`/questions/${question.id}`}
                      >
                        {question.questionText}
                      </Link>
                      {question.category ? <Badge>{question.category}</Badge> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {question.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                    {question.sourceSnippet ? (
                      <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border-muted bg-white px-3 py-3 text-sm leading-6 text-text-strong">
                        {question.sourceSnippet}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              title="来源原文"
            />
            <div className="max-h-[560px] overflow-auto rounded-xl border border-border-muted bg-surface-muted p-4 font-mono text-sm leading-6 text-text-strong whitespace-pre-wrap">
              {interview.sourceDocument.rawText}
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4" muted>
            <SectionHeading
              title="元信息"
            />
            <div className="space-y-3 text-sm text-text-strong">
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                公司: {interview.company ?? "未知"}
              </div>
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                岗位: {interview.role ?? "未知"}
              </div>
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                轮次: {interview.roundInfo ?? "未知"}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              title="来源文档"
            />
            <div className="space-y-3 text-sm text-text-strong">
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                <span className="font-medium">标题:</span> {interview.sourceDocument.title}
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                <span className="font-medium">类型:</span> {interview.sourceDocument.kind}
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                <span className="font-medium">更新时间:</span>{" "}
                {formatDateTime(interview.sourceDocument.updatedAt)}
              </div>
              {interview.sourceDocument.fileName ? (
                <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                  <span className="font-medium">文件:</span>{" "}
                  {interview.sourceDocument.fileName}
                </div>
              ) : null}
              {interview.sourceDocument.sourceUrl ? (
                <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                  <span className="font-medium">来源链接:</span>{" "}
                  <Link
                    className="text-accent hover:underline"
                    href={interview.sourceDocument.sourceUrl}
                    target="_blank"
                  >
                    {interview.sourceDocument.sourceUrl}
                  </Link>
                </div>
              ) : null}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
