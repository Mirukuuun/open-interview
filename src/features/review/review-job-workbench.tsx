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
import { Textarea } from "@/components/ui/textarea";
import type {
  ConfirmParseJobResponseData,
  CreateParseJobResponseData,
} from "@/lib/schemas/parse-jobs";
import { formatCategoryLabel, formatTagLabels } from "@/lib/taxonomy-display";
import { cn } from "@/lib/utils";
import type { ReviewJobDetail } from "@/server/services/parse-review-service";

import {
  formatTimestamp,
  jobTypeLabel,
  parseJobStatusMeta,
  sourceKindLabel,
  sourceParseStatusMeta,
} from "./review-shared";

type ReviewJobWorkbenchProps = {
  detail: ReviewJobDetail;
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

type InterviewDraft = {
  company: string;
  role: string;
  roundInfo: string;
  summary: string;
  tags: string;
};

type QuestionDraft = {
  questionText: string;
  canonicalAnswer: string;
  sourceAnswer: string;
  category: string;
  tags: string;
  confidence: number | null;
  action: "create" | "merge" | "skip";
  targetQuestionId: string;
};

function Field({
  label,
  description,
  children,
}: Readonly<{
  label: string;
  description?: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="block space-y-2">
      <div className="space-y-1">
        <div className="text-sm font-medium text-text-strong">{label}</div>
        {description ? (
          <p className="text-xs leading-5 text-text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </label>
  );
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，]/u)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function formatLocalizedTagSummary(tags: string[]) {
  if (tags.length === 0) {
    return "无";
  }

  return formatTagLabels(tags).join(", ");
}

function actionLabel(action: QuestionDraft["action"]) {
  switch (action) {
    case "create":
      return "新建";
    case "merge":
      return "合并";
    case "skip":
      return "跳过";
    default:
      return action;
  }
}

function hasInterviewDraftValue(value: InterviewDraft) {
  return Boolean(
    value.company.trim() ||
      value.role.trim() ||
      value.roundInfo.trim() ||
      value.summary.trim() ||
      parseTags(value.tags).length > 0,
  );
}

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

export function ReviewJobWorkbench({ detail }: ReviewJobWorkbenchProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [jobSummary, setJobSummary] = useState(detail.parseJob);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const [interviewDraft, setInterviewDraft] = useState<InterviewDraft>({
    company: detail.result?.interview_experience?.company ?? "",
    role: detail.result?.interview_experience?.role ?? "",
    roundInfo: detail.result?.interview_experience?.round_info ?? "",
    summary:
      detail.result?.interview_experience?.summary ??
      detail.result?.source_summary ??
      "",
    tags: (detail.result?.interview_experience?.tags ?? []).join(", "),
  });
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>(
    (detail.result?.questions ?? []).map((question) => ({
      questionText: question.question_text,
      canonicalAnswer: question.canonical_answer ?? "",
      sourceAnswer: question.source_answer ?? "",
      category: question.category ?? "",
      tags: (question.tags ?? []).join(", "),
      confidence: question.confidence ?? null,
      action: question.merge_hint_question_id ? "merge" : "create",
      targetQuestionId: question.merge_hint_question_id ?? "",
    })),
  );

  const activeCandidate = questionDrafts[activeCandidateIndex];
  const activeMergeTarget = detail.mergeTargets.find(
    (target) => target.id === activeCandidate?.targetQuestionId,
  );
  const visibleSummary = questionDrafts.reduce(
    (summary, question) => {
      summary[question.action] += 1;
      return summary;
    },
    {
      create: 0,
      merge: 0,
      skip: 0,
    },
  );
  const invalidQuestion = questionDrafts.find(
    (question) =>
      question.action !== "skip" && question.questionText.trim().length === 0,
  );
  const missingMergeTarget = questionDrafts.find(
    (question) =>
      question.action === "merge" && question.targetQuestionId.trim().length === 0,
  );
  const canConfirm =
    jobSummary.job_type === "extract_interview" &&
    jobSummary.status === "needs_review" &&
    !invalidQuestion &&
    !missingMergeTarget;

  function openConfirmDialog() {
    if (!canConfirm || isConfirming) {
      return;
    }

    setIsConfirmDialogOpen(true);
  }

  async function handleRetry() {
    setIsRetrying(true);
    setFeedback(undefined);

    try {
      const response = await fetch(`/api/parse-jobs/${jobSummary.id}/retry`, {
        method: "POST",
      });
      const data = await readApiResponse<CreateParseJobResponseData>(response);

      setFeedback({
        tone: "success",
        title: "已重新触发解析",
        body: `任务 ${data.parse_job.id} 已重新执行，页面将刷新显示最新结果。`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "重试失败",
        body:
          error instanceof Error ? error.message : "当前无法重试该解析任务。",
      });
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleConfirm() {
    if (!canConfirm) {
      return;
    }

    setIsConfirming(true);
    setFeedback(undefined);

    try {
      const response = await fetch(`/api/parse-jobs/${jobSummary.id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interview_experience:
            jobSummary.job_type === "extract_interview" &&
            hasInterviewDraftValue(interviewDraft)
              ? {
                  company: interviewDraft.company || null,
                  role: interviewDraft.role || null,
                  round_info: interviewDraft.roundInfo || null,
                  summary: interviewDraft.summary || null,
                  tags: parseTags(interviewDraft.tags),
                }
              : null,
          questions: questionDrafts.map((question) => ({
            action: question.action,
            ...(question.action === "merge"
              ? { target_question_id: question.targetQuestionId.trim() }
              : {}),
            question_text: question.questionText.trim(),
            canonical_answer: question.canonicalAnswer.trim() || null,
            source_answer: question.sourceAnswer.trim() || null,
            category: question.category.trim() || null,
            tags: parseTags(question.tags),
          })),
        }),
      });
      const data = await readApiResponse<ConfirmParseJobResponseData>(response);

      setJobSummary(data.parse_job);
      setIsConfirmDialogOpen(false);
      window.location.reload();
      return;
    } catch (error) {
      setIsConfirmDialogOpen(false);
      setFeedback({
        tone: "error",
        title: "确认导入失败",
        body:
          error instanceof Error
            ? error.message
            : "当前无法完成确认导入。",
      });
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/review">返回队列</Button>
            <Button
              disabled={isRetrying || jobSummary.status === "confirmed"}
              onClick={handleRetry}
            >
              {isRetrying ? "重试中..." : "重试解析"}
            </Button>
            <Button
              disabled={!canConfirm || isConfirming}
              onClick={openConfirmDialog}
              variant="primary"
            >
              {isConfirming ? "入库中..." : "确认入库"}
            </Button>
          </>
        }
        routeLabel={`/review/${jobSummary.id}`}
        title="审核解析结果"
      />

      <DetailGrid
        items={[
          { label: "任务 ID", value: jobSummary.id },
          { label: "任务类型", value: jobTypeLabel(jobSummary.job_type) },
          { label: "状态", value: parseJobStatusMeta(jobSummary.status).label },
          { label: "尝试次数", value: `${jobSummary.attempt_count}` },
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading title="来源上下文" />

          <div className="flex flex-wrap items-center gap-2">
            <Badge>{sourceKindLabel(detail.sourceDocument.kind)}</Badge>
            <Badge tone={sourceParseStatusMeta(detail.sourceDocument.parseStatus).tone}>
              来源 {sourceParseStatusMeta(detail.sourceDocument.parseStatus).label}
            </Badge>
            <Badge tone={parseJobStatusMeta(jobSummary.status).tone}>
              任务 {parseJobStatusMeta(jobSummary.status).label}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-strong">
              {detail.sourceDocument.title}
            </p>
            <p className="font-mono text-xs text-text-muted">{detail.sourceDocument.id}</p>
            <p className="text-xs text-text-muted">
              创建于 {formatTimestamp(detail.sourceDocument.createdAt)}，最近更新时间{" "}
              {formatTimestamp(detail.sourceDocument.updatedAt)}
            </p>
            {jobSummary.error_message ? (
              <p className="text-sm leading-6 text-warning">{jobSummary.error_message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="公司">
              <Input
                disabled={jobSummary.job_type !== "extract_interview"}
                onChange={(event) =>
                  setInterviewDraft((current) => ({
                    ...current,
                    company: event.target.value,
                  }))
                }
                placeholder="美团"
                value={interviewDraft.company}
              />
            </Field>
            <Field label="岗位">
              <Input
                disabled={jobSummary.job_type !== "extract_interview"}
                onChange={(event) =>
                  setInterviewDraft((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                placeholder="后端开发"
                value={interviewDraft.role}
              />
            </Field>
            <Field label="轮次">
              <Input
                disabled={jobSummary.job_type !== "extract_interview"}
                onChange={(event) =>
                  setInterviewDraft((current) => ({
                    ...current,
                    roundInfo: event.target.value,
                  }))
                }
                placeholder="一面"
                value={interviewDraft.roundInfo}
              />
            </Field>
            <Field label="标签">
              <Input
                disabled={jobSummary.job_type !== "extract_interview"}
                onChange={(event) =>
                  setInterviewDraft((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
                placeholder="java, redis, mq"
                value={interviewDraft.tags}
              />
            </Field>
          </div>

          <Field label="摘要">
            <Textarea
              disabled={jobSummary.job_type !== "extract_interview"}
              onChange={(event) =>
                setInterviewDraft((current) => ({
                  ...current,
                  summary: event.target.value,
                }))
              }
              placeholder="偏 Java 基础、Redis、并发。"
              value={interviewDraft.summary}
            />
          </Field>

          <Field label="原文">
            <Textarea
              className="min-h-[360px] font-mono text-xs leading-6"
              readOnly
              value={detail.sourceDocument.rawText}
            />
          </Field>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <SectionHeading title={`候选题（${questionDrafts.length}）`} />

          {!detail.result ? (
            <EmptyList title="暂无解析结果" />
          ) : questionDrafts.length === 0 ? (
            <EmptyList title="没有提取到候选题" />
          ) : (
            <div className="space-y-4">
              {questionDrafts.map((question, index) => (
                <div
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    activeCandidateIndex === index
                      ? "border-accent bg-accent-soft"
                      : "border-border-muted bg-surface-muted",
                  )}
                  key={`${index}-${question.targetQuestionId}-${question.questionText}`}
                  onClick={() => setActiveCandidateIndex(index)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge tone="accent">候选 {index + 1}</Badge>
                        <Badge>{actionLabel(question.action)}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-text-strong">
                        {question.questionText || "未填写题目"}
                      </p>
                    </div>
                    <span className="text-xs text-text-muted">
                      置信度 {question.confidence?.toFixed(2) ?? "无"}
                    </span>
                  </div>

                  {!(
                    activeCandidateIndex === index
                  ) ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                      <span>
                        分类: {formatCategoryLabel(question.category) ?? "未设置"}
                      </span>
                      <span>标签: {parseTags(question.tags).length}</span>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <Field label="题目">
                        <Input
                          onChange={(event) =>
                            setQuestionDrafts((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, questionText: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          onFocus={() => setActiveCandidateIndex(index)}
                          value={question.questionText}
                        />
                      </Field>

                      <Field label="标准答案">
                        <Textarea
                          onChange={(event) =>
                            setQuestionDrafts((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, canonicalAnswer: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          onFocus={() => setActiveCandidateIndex(index)}
                          placeholder="写入 canonical_answer。"
                          value={question.canonicalAnswer}
                        />
                      </Field>

                      <Field label="来源答案">
                        <Textarea
                          onChange={(event) =>
                            setQuestionDrafts((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, sourceAnswer: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          onFocus={() => setActiveCandidateIndex(index)}
                          placeholder="可选。"
                          value={question.sourceAnswer}
                        />
                      </Field>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="分类">
                          <Input
                            onChange={(event) =>
                              setQuestionDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, category: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            onFocus={() => setActiveCandidateIndex(index)}
                            placeholder="distributed_system"
                            value={question.category}
                          />
                        </Field>

                        <Field label="标签">
                          <Input
                            onChange={(event) =>
                              setQuestionDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, tags: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            onFocus={() => setActiveCandidateIndex(index)}
                            placeholder="redis, lock"
                            value={question.tags}
                          />
                        </Field>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="处理方式">
                          <Select
                            onChange={(event) =>
                              setQuestionDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        action: event.target.value as QuestionDraft["action"],
                                      }
                                    : item,
                                ),
                              )
                            }
                            onFocus={() => setActiveCandidateIndex(index)}
                            value={question.action}
                          >
                            <option value="create">新建</option>
                            <option value="merge">合并</option>
                            <option value="skip">跳过</option>
                          </Select>
                        </Field>

                        <Field
                          description="填写已有 canonical 题目 ID。当前正式题库 ID 也使用 q_ 前缀，不是临时占位。"
                          label="目标题目 ID"
                        >
                          <Input
                            disabled={question.action !== "merge"}
                            onChange={(event) =>
                              setQuestionDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        targetQuestionId: event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            onFocus={() => setActiveCandidateIndex(index)}
                            placeholder="例如 q_existing123"
                            value={question.targetQuestionId}
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <SectionHeading title="导入预览" />

            {jobSummary.job_type !== "extract_interview" ? (
              <EmptyList title="当前类型仅支持查看，不支持确认写入" />
            ) : !activeCandidate ? (
              <EmptyList title="暂无候选题预览" />
            ) : activeCandidate.action === "merge" ? (
              activeMergeTarget ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">合并目标</Badge>
                    <Badge>{activeMergeTarget.reviewStatus}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-strong">
                      {activeMergeTarget.questionText}
                    </p>
                    <p className="font-mono text-xs text-text-muted">
                      {activeMergeTarget.id}
                    </p>
                    <p className="text-xs leading-5 text-text-muted">
                      这是现有 canonical 题目的正式 ID；当前正式主键前缀就是 q_。
                    </p>
                  </div>
                  <div className="rounded-xl border border-border-muted bg-surface-muted p-4 text-sm text-text-muted">
                    <p>
                      分类: {formatCategoryLabel(activeMergeTarget.category) ?? "未设置"}
                    </p>
                    <p className="mt-2">来源数: {activeMergeTarget.sourceCount}</p>
                    <p className="mt-2">
                      标签:{" "}
                      {formatLocalizedTagSummary(activeMergeTarget.tags)}
                    </p>
                  </div>
                  <Field label="当前标准答案">
                    <Textarea readOnly value={activeMergeTarget.canonicalAnswer ?? ""} />
                  </Field>
                </div>
              ) : (
                <EmptyList title="未找到合并目标预览" />
              )
            ) : activeCandidate.action === "skip" ? (
              <EmptyList title="当前候选题不会导入" />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">新建预览</Badge>
                </div>
                <div className="rounded-xl border border-border-muted bg-surface-muted p-4">
                  <p className="text-sm font-semibold text-text-strong">
                    {activeCandidate.questionText || "未填写题目"}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-text-muted">
                    分类: {formatCategoryLabel(activeCandidate.category) ?? "未设置"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    标签:{" "}
                    {formatLocalizedTagSummary(parseTags(activeCandidate.tags))}
                  </p>
                </div>
                <Field label="标准答案预览">
                  <Textarea readOnly value={activeCandidate.canonicalAnswer} />
                </Field>
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-5">
            <SectionHeading title="批量摘要" />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                  新建
                </div>
                <div className="mt-1 text-sm font-semibold text-text-strong">
                  {visibleSummary.create}
                </div>
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                  合并
                </div>
                <div className="mt-1 text-sm font-semibold text-text-strong">
                  {visibleSummary.merge}
                </div>
              </div>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                  跳过
                </div>
                <div className="mt-1 text-sm font-semibold text-text-strong">
                  {visibleSummary.skip}
                </div>
              </div>
            </div>

            {detail.result?.warnings && detail.result.warnings.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-text-muted">
                <p className="font-semibold text-text-strong">解析提示</p>
                <ul className="mt-2 space-y-1">
                  {detail.result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!canConfirm ? (
              <div className="rounded-xl border border-border-muted bg-surface-muted p-4 text-sm leading-6 text-text-muted">
                {jobSummary.job_type !== "extract_interview"
                  ? "当前任务类型还没有确认写入路径。"
                  : jobSummary.status === "confirmed"
                    ? "这个任务已经确认过了，不会再次写入 canonical。"
                    : missingMergeTarget
                      ? "仍有合并候选题没有填写目标 ID。"
                      : invalidQuestion
                        ? "仍有新建或合并候选题缺少题目。"
                        : "当前还不能执行确认导入。"}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button href="/review">返回队列</Button>
              <Button
                disabled={jobSummary.status === "confirmed" || isRetrying}
                onClick={handleRetry}
              >
                {isRetrying ? "重试中..." : "重试解析"}
              </Button>
              <Button
                disabled={!canConfirm || isConfirming}
                onClick={openConfirmDialog}
                variant="primary"
              >
                {isConfirming ? "入库中..." : "确认入库"}
              </Button>
            </div>

            <div className="rounded-xl border border-border-muted bg-surface-muted p-4 text-sm text-text-muted">
              <p>创建时间: {formatTimestamp(jobSummary.created_at)}</p>
              <p className="mt-2">开始时间: {formatTimestamp(jobSummary.started_at)}</p>
              <p className="mt-2">完成时间: {formatTimestamp(jobSummary.finished_at)}</p>
            </div>
          </SurfaceCard>
        </div>
      </div>

      {isConfirmDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div
            aria-describedby="confirm-import-description"
            aria-labelledby="confirm-import-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-border-strong bg-white p-6 shadow-xl"
            role="dialog"
          >
            <div className="space-y-3">
              <p
                className="text-base font-semibold text-text-strong"
                id="confirm-import-title"
              >
                确认把当前审核结果写入 canonical 题库？
              </p>
              <p
                className="text-sm leading-6 text-text-muted"
                id="confirm-import-description"
              >
                确认后会提交当前候选题处理结果，并刷新页面到最新已确认状态。
              </p>
              <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3 text-sm text-text-muted">
                <p>新建 {visibleSummary.create} 条</p>
                <p className="mt-1">合并 {visibleSummary.merge} 条</p>
                <p className="mt-1">跳过 {visibleSummary.skip} 条</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                disabled={isConfirming}
                onClick={() => setIsConfirmDialogOpen(false)}
              >
                取消
              </Button>
              <Button disabled={isConfirming} onClick={handleConfirm} variant="primary">
                {isConfirming ? "入库中..." : "确认并入库"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
