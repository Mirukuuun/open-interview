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
    throw new Error("响应体不是合法 JSON。");
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

  function resetFilters() {
    setFilters({
      status: "all",
      kind: "all",
      query: "",
    });
  }

  function runCreateJob(
    sourceDocumentId: string,
    kind: "interview_experience" | "knowledge_note" | "resume",
  ) {
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
          body: `任务 ${data.parse_job.id} 当前状态为 ${parseJobStatusMeta(data.parse_job.status).label}。`,
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
          body: `任务 ${data.parse_job.id} 已重新解析，当前状态为 ${parseJobStatusMeta(data.parse_job.status).label}。`,
        });
        router.push(`/review/${data.parse_job.id}`);
      } catch (error) {
        setFeedback({
          tone: "error",
          title: "重试失败",
          body:
            error instanceof Error ? error.message : "当前无法重试该任务。",
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
            <Button href="/import">返回导入</Button>
            <Button href="/questions" variant="primary">
              打开题库
            </Button>
          </>
        }
        routeLabel="/review"
        title="审核队列"
      />

      <DetailGrid
        items={[
          { label: "待处理来源", value: `${visiblePendingSources.length}` },
          { label: "待审核任务", value: `${visibleSummary.needs_review}` },
          { label: "失败任务", value: `${visibleSummary.failed}` },
          { label: "已确认", value: `${visibleSummary.confirmed}` },
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

      <SurfaceCard className="space-y-4">
        <SectionHeading title="筛选" />
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-strong">关键词</span>
            <Input
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
              placeholder="搜索来源标题、任务 ID 或错误信息"
              value={filters.query}
            />
          </label>

          <label className="space-y-2">
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
              <option value="pending">待执行</option>
              <option value="running">执行中</option>
              <option value="needs_review">待人工处理</option>
              <option value="failed">失败</option>
              <option value="confirmed">已入库</option>
            </Select>
          </label>

          <label className="space-y-2">
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
              <option value="interview_experience">面经</option>
              <option value="knowledge_note">知识笔记</option>
              <option value="resume">简历</option>
            </Select>
          </label>

          <div className="flex items-end">
            <Button className="w-full" onClick={resetFilters}>
              清空筛选
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading title={`待处理来源（${visiblePendingSources.length}）`} />
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">先创建任务</Badge>
            <Badge>{`待执行 ${visibleSummary.pending}`}</Badge>
            <Badge>{`执行中 ${visibleSummary.running}`}</Badge>
            <Badge tone="warning">{`待审核 ${visibleSummary.needs_review}`}</Badge>
          </div>
        </div>

        {visiblePendingSources.length === 0 ? (
          <EmptyList title="没有待处理来源" />
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
                      onClick={() => runCreateJob(sourceDocument.id, sourceDocument.kind)}
                      variant="primary"
                    >
                      {isSubmitting && activeMutationKey === mutationKey
                        ? "创建中..."
                        : "创建解析任务"}
                    </Button>
                    <Button href="/import" variant="ghost">
                      返回导入
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading title={`解析任务（${visibleJobs.length}）`} />
        </div>

        {visibleJobs.length === 0 ? (
          <EmptyList title="没有可见任务" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-strong">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  {["任务", "来源", "类型", "状态", "时间", "候选题", "操作"].map(
                    (column) => (
                      <th
                        className="border-b border-border-strong px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted"
                        key={column}
                      >
                        {column}
                      </th>
                    ),
                  )}
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
                          <p className="font-mono text-xs text-text-strong">{job.id}</p>
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
                              来源 {sourceStatus.label}
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
                            第 {job.attempt_count} 次
                          </p>
                          {job.error_message ? (
                            <p className="max-w-[260px] text-xs leading-5 text-warning">
                              {job.error_message}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-text-muted">
                        <div>{formatTimestamp(job.created_at)}</div>
                        <div className="mt-1 text-xs text-text-muted">
                          更新:{" "}
                          {job.finished_at
                            ? formatTimestamp(job.finished_at)
                            : formatTimestamp(job.updated_at)}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-text-muted">
                        {job.candidate_question_count}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {job.status === "failed" ||
                          job.status === "needs_review" ? (
                            <Button
                              disabled={
                                isSubmitting &&
                                activeMutationKey === retryMutationKey
                              }
                              onClick={() => runRetry(job.id)}
                            >
                              {isSubmitting && activeMutationKey === retryMutationKey
                                ? "重试中..."
                                : "重试"}
                            </Button>
                          ) : null}
                          <Button
                            href={`/review/${job.id}`}
                            variant={job.status === "needs_review" ? "primary" : "ghost"}
                          >
                            {job.status === "needs_review" ? "打开审核" : "查看详情"}
                          </Button>
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
  );
}
