"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { CreateParseJobResponseData } from "@/lib/schemas/parse-jobs";
import { cn } from "@/lib/utils";
import type { ReviewQueueData } from "@/server/services/parse-review-service";

import {
  formatTimestamp,
  jobTypeLabel,
  parseJobStatusMeta,
  sourceKindLabel,
  sourceParseStatusMeta,
} from "./review-shared";

type ReviewQueueWorkbenchProps = {
  initialData: ReviewQueueData;
};

type FeedbackState =
  | {
      tone: "success" | "error";
      title: string;
      body: string;
    }
  | undefined;

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!payload) {
    throw new Error("Response body is not valid JSON.");
  }

  if (!payload.ok) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}

function deriveJobType(
  kind: "interview_experience" | "knowledge_note" | "resume",
) {
  return kind === "resume" ? "extract_resume" : "extract_interview";
}

export function ReviewQueueWorkbench({
  initialData,
}: ReviewQueueWorkbenchProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [activeMutationKey, setActiveMutationKey] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    kind: "all",
    query: "",
  });

  const visibleJobs = initialData.items.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }

    if (filters.kind !== "all" && item.source_kind !== filters.kind) {
      return false;
    }

    if (filters.query.trim().length === 0) {
      return true;
    }

    const query = filters.query.trim().toLowerCase();

    return (
      item.id.toLowerCase().includes(query) ||
      item.source_title.toLowerCase().includes(query) ||
      item.job_type.toLowerCase().includes(query) ||
      (item.error_message ?? "").toLowerCase().includes(query)
    );
  });
  const visiblePendingSources = initialData.pendingSources.filter((item) => {
    if (filters.kind !== "all" && item.kind !== filters.kind) {
      return false;
    }

    if (filters.query.trim().length === 0) {
      return true;
    }

    const query = filters.query.trim().toLowerCase();

    return item.id.toLowerCase().includes(query) || item.title.toLowerCase().includes(query);
  });
  const visibleSummary = visibleJobs.reduce(
    (summary, item) => {
      if (item.status in summary) {
        summary[item.status as keyof typeof summary] += 1;
      }

      return summary;
    },
    {
      pending: 0,
      running: 0,
      failed: 0,
      needs_review: 0,
      confirmed: 0,
    },
  );

  function runCreateJob(sourceDocumentId: string, kind: "interview_experience" | "knowledge_note" | "resume") {
    setActiveMutationKey(`create:${sourceDocumentId}`);
    setFeedback(undefined);
    setIsSubmitting(true);

    void (async () => {
      try {
        const response = await fetch("/api/parse-jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_document_id: sourceDocumentId,
            job_type: deriveJobType(kind),
          }),
        });
        const data = await readApiResponse<CreateParseJobResponseData>(response);

        setFeedback({
          tone: "success",
          title: "解析任务已就绪",
          body: `任务 ${data.parse_job.id} 当前状态为 ${data.parse_job.status}，已跳转到审核页。`,
        });
        router.push(`/review/${data.parse_job.id}`);
      } catch (error) {
        setFeedback({
          tone: "error",
          title: "创建解析任务失败",
          body:
            error instanceof Error
              ? error.message
              : "当前无法创建解析任务，请稍后再试。",
        });
      } finally {
        setIsSubmitting(false);
        setActiveMutationKey(null);
      }
    })();
  }

  function runRetry(jobId: string) {
    setActiveMutationKey(`retry:${jobId}`);
    setFeedback(undefined);
    setIsSubmitting(true);

    void (async () => {
      try {
        const response = await fetch(`/api/parse-jobs/${jobId}/retry`, {
          method: "POST",
        });
        const data = await readApiResponse<CreateParseJobResponseData>(response);

        setFeedback({
          tone: "success",
          title: "重试已执行",
          body: `任务 ${data.parse_job.id} 已重新解析，当前状态为 ${data.parse_job.status}。`,
        });
        router.push(`/review/${data.parse_job.id}`);
      } catch (error) {
        setFeedback({
          tone: "error",
          title: "重试失败",
          body:
            error instanceof Error
              ? error.message
              : "当前无法重试该任务。",
        });
      } finally {
        setIsSubmitting(false);
        setActiveMutationKey(null);
      }
    })();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/import">返回导入台</Button>
            <Button href="/questions" variant="primary">
              打开题库
            </Button>
          </>
        }
        description="Review Queue 负责把 parse 结果变成可检查、可重试、可确认的工作流。原始 source 先落地，parse job 再落地，最后由人工确认写入 canonical。"
        routeLabel="/review"
        title="审核解析任务并决定是否写入 canonical"
      />

      <DetailGrid
        items={[
          { label: "待创建 source", value: `${visiblePendingSources.length}` },
          { label: "待审核 job", value: `${visibleSummary.needs_review}` },
          { label: "失败 job", value: `${visibleSummary.failed}` },
          { label: "当前可见", value: `${visibleJobs.length} jobs` },
        ]}
      />

      {feedback ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-4",
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50",
          )}
        >
          <p className="text-sm font-semibold text-text-strong">{feedback.title}</p>
          <p className="mt-2 text-sm leading-6 text-text-muted">{feedback.body}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="过滤器先服务于人工扫描和运维可见性，不追求复杂搜索能力。"
            title="队列过滤"
          />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-strong">状态</span>
            <Select
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              value={filters.status}
            >
              <option value="all">全部状态</option>
              <option value="pending">pending</option>
              <option value="running">running</option>
              <option value="needs_review">needs_review</option>
              <option value="failed">failed</option>
              <option value="confirmed">confirmed</option>
            </Select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-strong">来源类型</span>
            <Select
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  kind: event.target.value,
                }))
              }
              value={filters.kind}
            >
              <option value="all">全部类型</option>
              <option value="interview_experience">interview_experience</option>
              <option value="knowledge_note">knowledge_note</option>
              <option value="resume">resume</option>
            </Select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-strong">关键词</span>
            <Input
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
              placeholder="搜索 source title / job id / error"
              value={filters.query}
            />
          </label>

          <Button
            className="w-full"
            onClick={() =>
              setFilters({
                status: "all",
                kind: "all",
                query: "",
              })
            }
          >
            清空过滤器
          </Button>

          <div className="rounded-xl border border-border-muted bg-surface-muted p-4 text-sm text-text-muted">
            <p className="font-semibold text-text-strong">状态摘要</p>
            <div className="mt-3 space-y-2">
              <div>pending: {visibleSummary.pending}</div>
              <div>running: {visibleSummary.running}</div>
              <div>needs_review: {visibleSummary.needs_review}</div>
              <div>failed: {visibleSummary.failed}</div>
              <div>confirmed: {visibleSummary.confirmed}</div>
            </div>
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <SectionHeading
              description="Slice 2 里只落 raw source；这里补上显式的 parse job 创建入口，避免结果偷偷直写 canonical。"
              title={`待创建解析任务 (${visiblePendingSources.length})`}
            />

            {visiblePendingSources.length === 0 ? (
              <EmptyList
                bullets={[
                  "新导入的 source 如果还没开始解析，会出现在这里。",
                  "创建任务后会直接进入 `/review/:jobId`，方便立刻检查结果。",
                  "manual_input 不走 parse job，这里不会展示。",
                ]}
                description="当前没有处于 `not_started` 的 source。你可以回到 Import 页面继续导入，或直接处理下面已有的 parse job。"
                title="没有待创建任务的 source"
              />
            ) : (
              <div className="space-y-3">
                {visiblePendingSources.map((sourceDocument) => {
                  const parseStatus = sourceParseStatusMeta(sourceDocument.parseStatus);
                  const mutationKey = `create:${sourceDocument.id}`;

                  return (
                    <div
                      className="rounded-xl border border-border-muted bg-surface-muted p-4"
                      key={sourceDocument.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge>{sourceKindLabel(sourceDocument.kind)}</Badge>
                            <Badge tone={parseStatus.tone}>{parseStatus.label}</Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-text-strong">
                              {sourceDocument.title}
                            </p>
                            <p className="font-mono text-xs text-text-muted">
                              {sourceDocument.id}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-text-muted">
                          {formatTimestamp(sourceDocument.createdAt)}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button
                          disabled={isSubmitting && activeMutationKey === mutationKey}
                          onClick={() =>
                            runCreateJob(sourceDocument.id, sourceDocument.kind)
                          }
                          variant="primary"
                        >
                          {isSubmitting && activeMutationKey === mutationKey
                            ? "创建中..."
                            : "创建解析任务"}
                        </Button>
                        <Button href="/import" variant="ghost">
                          查看导入页
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-5">
            <SectionHeading
              description="任务表优先服务于状态可见性和批量扫描，不做隐藏式自动导入。"
              title={`解析任务 (${visibleJobs.length})`}
            />

            {visibleJobs.length === 0 ? (
              <EmptyList
                bullets={[
                  "先从上方 source 列表创建 parse job。",
                  "解析失败的任务会保留在队列里，便于重试。",
                  "待人工确认的任务可以一键进入三栏 review desk。",
                ]}
                description="当前过滤器下没有匹配的 parse job。你可以清空过滤器，或先创建新的解析任务。"
                title="队列里还没有可见任务"
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border-strong">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-surface-muted">
                    <tr>
                      {[
                        "job_id",
                        "source title",
                        "job_type",
                        "status",
                        "created_at",
                        "updated_at",
                        "candidate_count",
                        "actions",
                      ].map((column) => (
                        <th
                          className="border-b border-border-strong px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted"
                          key={column}
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {visibleJobs.map((job) => {
                      const jobStatus = parseJobStatusMeta(job.status);
                      const sourceStatus = sourceParseStatusMeta(job.source_parse_status);
                      const retryMutationKey = `retry:${job.id}`;

                      return (
                        <tr
                          className="border-b border-border-muted last:border-b-0"
                          key={job.id}
                        >
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-1">
                              <p className="font-mono text-xs text-text-strong">
                                {job.id}
                              </p>
                              <p className="font-mono text-[11px] text-text-muted">
                                src {job.source_document_id}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-text-muted">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-text-strong">
                                {job.source_title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge>{sourceKindLabel(job.source_kind)}</Badge>
                                <Badge tone={sourceStatus.tone}>
                                  source {sourceStatus.label}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-text-muted">
                            {jobTypeLabel(job.job_type)}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-2">
                              <Badge tone={jobStatus.tone}>{jobStatus.label}</Badge>
                              <p className="text-xs text-text-muted">
                                attempt {job.attempt_count}
                              </p>
                              {job.error_message ? (
                                <p className="max-w-[220px] text-xs leading-5 text-warning">
                                  {job.error_message}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-text-muted">
                            {formatTimestamp(job.created_at)}
                          </td>
                          <td className="px-4 py-4 align-top text-text-muted">
                            {job.finished_at
                              ? formatTimestamp(job.finished_at)
                              : formatTimestamp(job.updated_at)}
                          </td>
                          <td className="px-4 py-4 align-top text-text-muted">
                            {job.candidate_question_count}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button href={`/review/${job.id}`}>打开审核</Button>
                              {job.status === "failed" ? (
                                <Button
                                  disabled={
                                    isSubmitting &&
                                    activeMutationKey === retryMutationKey
                                  }
                                  onClick={() => runRetry(job.id)}
                                  variant="primary"
                                >
                                  {isSubmitting && activeMutationKey === retryMutationKey
                                    ? "重试中..."
                                    : "重试"}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
