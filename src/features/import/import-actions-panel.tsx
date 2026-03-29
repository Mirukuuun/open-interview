"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CreateManualQaResponseData,
  CreateTextSourceResponseData,
  CreateUploadSourceResponseData,
  UploadSourceSubmitMode,
} from "@/lib/schemas/import";
import type { CreateParseJobResponseData } from "@/lib/schemas/parse-jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCategoryLabel, formatTagLabel } from "@/lib/taxonomy-display";
import { cn } from "@/lib/utils";

import { CreatableMultiSelect } from "./creatable-multi-select";

type ImportMode = "upload" | "paste" | "manual";
type TextSubmitMode = "save_only" | "save_and_review";
type IngestableSourceKind =
  | "interview_experience"
  | "knowledge_note"
  | "resume";

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

type FeedbackState =
  | {
      tone: "success" | "error";
      title: string;
      body: string;
      actionHref?: string;
      actionLabel?: string;
    }
  | undefined;

type ImportActionsPanelProps = {
  manualQaOptions: {
    categories: string[];
    tags: string[];
  };
};

const importModes: Array<{
  id: ImportMode;
  title: string;
}> = [
  {
    id: "manual",
    title: "手工录入",
  },
  {
    id: "paste",
    title: "粘贴原文",
  },
  {
    id: "upload",
    title: "文件上传",
  },
];

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

function sourceKindLabel(value: string) {
  switch (value) {
    case "interview_experience":
      return "面经";
    case "knowledge_note":
      return "知识笔记";
    case "resume":
      return "简历";
    default:
      return value;
  }
}

function uploadNextStepLabel(
  kind: "create_parse_job" | "open_review" | "inspect_parse_failure",
) {
  switch (kind) {
    case "create_parse_job":
      return "去审核队列创建任务";
    case "inspect_parse_failure":
      return "查看失败任务";
    case "open_review":
    default:
      return "打开审核结果";
  }
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

export function ImportActionsPanel({
  manualQaOptions,
}: ImportActionsPanelProps) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<ImportMode>("manual");
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textSubmitMode, setTextSubmitMode] =
    useState<TextSubmitMode>("save_only");
  const [uploadSubmitMode, setUploadSubmitMode] =
    useState<UploadSourceSubmitMode>("save_and_review");

  const [textSourceForm, setTextSourceForm] = useState({
    title: "",
    kind: "interview_experience" as IngestableSourceKind,
    sourceUrl: "",
    rawText: "",
  });

  const [uploadForm, setUploadForm] = useState({
    title: "",
    kind: "interview_experience" as IngestableSourceKind,
    sourceUrl: "",
    file: null as File | null,
  });

  const [manualQaForm, setManualQaForm] = useState({
    questionText: "",
    answerText: "",
    categories: [] as string[],
    tags: [] as string[],
  });

  async function createParseJob(
    sourceDocumentId: string,
    jobType: "extract_interview" | "extract_resume",
  ) {
    const response = await fetch("/api/parse-jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_document_id: sourceDocumentId,
        job_type: jobType,
      }),
    });

    return readApiResponse<CreateParseJobResponseData>(response);
  }

  async function handleTextSourceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(undefined);

    try {
      const response = await fetch("/api/sources/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: textSourceForm.title,
          kind: textSourceForm.kind,
          raw_text: textSourceForm.rawText,
          source_url: textSourceForm.sourceUrl || null,
        }),
      });

      const data = await readApiResponse<CreateTextSourceResponseData>(response);
      const sourceId = data.source_document.id;

      if (textSubmitMode === "save_only") {
        setFeedback({
          tone: "success",
          title: "来源已保存",
          body: `来源 ${sourceId} 已写入，可稍后在审核队列创建解析任务。`,
        });
      } else {
        const parseJob = await createParseJob(
          sourceId,
          textSourceForm.kind === "resume"
            ? "extract_resume"
            : "extract_interview",
        );

        if (parseJob.parse_job.status === "needs_review") {
          setFeedback({
            tone: "success",
            title: "解析任务已创建",
            body: `来源 ${sourceId} 已创建任务 ${parseJob.parse_job.id}，可进入审核页处理候选结果。`,
          });
        } else {
          setFeedback({
            tone: "success",
            title: "已保存来源",
            body: `来源 ${sourceId} 已创建任务 ${parseJob.parse_job.id}，当前状态为 ${parseJob.parse_job.status}。`,
          });
        }
      }

      setTextSourceForm((current) => ({
        ...current,
        title: "",
        sourceUrl: "",
        rawText: "",
      }));
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "保存失败",
        body:
          error instanceof Error ? error.message : "当前无法保存该来源。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUploadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadForm.file) {
      setFeedback({
        tone: "error",
        title: "上传失败",
        body: "请选择一个 .txt、.md、.pdf 或 .docx 文件后再提交。",
      });
      return;
    }

    const formElement = event.currentTarget;

    setIsSubmitting(true);
    setFeedback(undefined);

    try {
      const requestBody = new FormData();

      requestBody.append("file", uploadForm.file);
      requestBody.append("kind", uploadForm.kind);
      requestBody.append("submit_mode", uploadSubmitMode);

      if (uploadForm.title.trim().length > 0) {
        requestBody.append("title", uploadForm.title.trim());
      }

      if (uploadForm.sourceUrl.trim().length > 0) {
        requestBody.append("source_url", uploadForm.sourceUrl.trim());
      }

      const response = await fetch("/api/sources/upload", {
        method: "POST",
        body: requestBody,
      });

      const data = await readApiResponse<CreateUploadSourceResponseData>(response);
      if (data.submit_mode === "save_only") {
        setFeedback({
          tone: "success",
          title: "文件已保存",
          body: `来源 ${data.source_document.id} 已保存，文件 ${data.source_document.file_name} 的文本抽取已完成。下一步可在审核队列创建解析任务。`,
          actionHref: data.next_step.href,
          actionLabel: uploadNextStepLabel(data.next_step.kind),
        });
      } else {
        const isParseFailed = data.parse_job.status === "failed";

        setFeedback({
          tone: isParseFailed ? "error" : "success",
          title: isParseFailed ? "来源已保存，解析失败" : "解析任务已创建",
          body: isParseFailed
            ? `来源 ${data.source_document.id} 已保存，但任务 ${data.parse_job.id} 解析失败。请在审核页查看错误并重试。`
            : data.parse_job.status === "needs_review"
              ? `来源 ${data.source_document.id} 已创建任务 ${data.parse_job.id}，候选结果已进入待审核状态。`
              : `来源 ${data.source_document.id} 已创建任务 ${data.parse_job.id}，当前状态为 ${data.parse_job.status}。`,
          actionHref: data.next_step.href,
          actionLabel: uploadNextStepLabel(data.next_step.kind),
        });
      }

      formElement.reset();
      setUploadForm({
        title: "",
        kind: "interview_experience",
        sourceUrl: "",
        file: null,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "上传失败",
        body:
          error instanceof Error ? error.message : "当前无法上传这个文件。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleManualQaSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(undefined);

    try {
      const response = await fetch("/api/manual-qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_text: manualQaForm.questionText,
          answer_text: manualQaForm.answerText,
          categories: manualQaForm.categories,
          tags: manualQaForm.tags,
        }),
      });

      const data = await readApiResponse<CreateManualQaResponseData>(response);

      setFeedback({
        tone: "success",
        title: "题目已创建",
        body: `题目 ${data.question_item.id}、答案 ${data.answer_variant.id} 和手工来源都已保存。`,
      });

      setManualQaForm({
        questionText: "",
        answerText: "",
        categories: [],
        tags: [],
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "创建失败",
        body:
          error instanceof Error ? error.message : "当前无法创建这条手工记录。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {importModes.map((mode) => {
          const isActive = mode.id === activeMode;

          return (
            <button
              className={cn(
                "rounded-xl border px-4 py-4 text-left transition-colors",
                isActive
                  ? "border-accent bg-accent-soft"
                  : "border-border-muted bg-surface-muted hover:border-border-strong hover:bg-white",
              )}
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setFeedback(undefined);
              }}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-strong">{mode.title}</p>
                {isActive ? <Badge tone="accent">当前</Badge> : null}
              </div>
            </button>
          );
        })}
      </div>

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
          {feedback.actionHref && feedback.actionLabel ? (
            <div className="mt-3">
              <Button href={feedback.actionHref} variant="primary">
                {feedback.actionLabel}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeMode === "upload" ? (
        <form className="space-y-5" onSubmit={handleUploadSubmit}>
          <div className="rounded-2xl border border-border-muted bg-surface-muted p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">上传</Badge>
              <p className="text-sm font-semibold text-text-strong">
                单文件上传会保存原始文件并抽取文本，当前支持 .txt / .md / .pdf / .docx；可仅保存来源，也可直接创建解析任务进入审核。
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              description="可留空，默认使用上传文件名。"
              label="标题"
            >
              <Input
                onChange={(event) =>
                  setUploadForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="可选"
                value={uploadForm.title}
              />
            </Field>

            <Field label="类型">
              <Select
                onChange={(event) =>
                  setUploadForm((current) => ({
                    ...current,
                    kind: event.target.value as IngestableSourceKind,
                  }))
                }
                value={uploadForm.kind}
              >
                <option value="interview_experience">
                  {sourceKindLabel("interview_experience")}
                </option>
                <option value="knowledge_note">
                  {sourceKindLabel("knowledge_note")}
                </option>
                <option value="resume">{sourceKindLabel("resume")}</option>
              </Select>
            </Field>
          </div>

          <Field label="来源链接">
            <Input
              onChange={(event) =>
                setUploadForm((current) => ({
                  ...current,
                  sourceUrl: event.target.value,
                }))
              }
              placeholder="https://example.com/post/interview-note"
              value={uploadForm.sourceUrl}
            />
          </Field>

          <Field
            description="服务端会把文件保存到本地 storage/raw/<source_id>/original.ext。"
            label="选择文件"
          >
            <input
              accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className={cn(
                "block w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-text-strong outline-none file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted",
              )}
              name="file"
              onChange={(event) =>
                setUploadForm((current) => ({
                  ...current,
                  file: event.target.files?.[0] ?? null,
                }))
              }
              required
              type="file"
            />
          </Field>

          {uploadForm.file ? (
            <p className="text-sm text-text-muted">
              已选择: {uploadForm.file.name} ({Math.max(1, Math.ceil(uploadForm.file.size / 1024))} KB)
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={isSubmitting}
              onClick={() => setUploadSubmitMode("save_and_review")}
              type="submit"
              variant="primary"
            >
              {isSubmitting ? "处理中..." : "上传并进入审核"}
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={() => setUploadSubmitMode("save_only")}
              type="submit"
            >
              仅上传保存
            </Button>
            <Button href="/review" variant="ghost">
              打开审核队列
            </Button>
          </div>

          <p className="text-xs leading-5 text-text-muted">
            “上传并进入审核” 会在保存 `source_document` 后立即创建解析任务，结果仍停在人工审核阶段，不会写入题库。
          </p>
        </form>
      ) : null}

      {activeMode === "paste" ? (
        <form className="space-y-5" onSubmit={handleTextSourceSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="标题">
              <Input
                onChange={(event) =>
                  setTextSourceForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="美团后端一面面经"
                required
                value={textSourceForm.title}
              />
            </Field>

            <Field label="类型">
              <Select
                onChange={(event) =>
                  setTextSourceForm((current) => ({
                    ...current,
                    kind: event.target.value as IngestableSourceKind,
                  }))
                }
                value={textSourceForm.kind}
              >
                <option value="interview_experience">
                  {sourceKindLabel("interview_experience")}
                </option>
                <option value="knowledge_note">
                  {sourceKindLabel("knowledge_note")}
                </option>
                <option value="resume">{sourceKindLabel("resume")}</option>
              </Select>
            </Field>
          </div>

          <Field label="来源链接">
            <Input
              onChange={(event) =>
                setTextSourceForm((current) => ({
                  ...current,
                  sourceUrl: event.target.value,
                }))
              }
              placeholder="https://example.com/post/interview-note"
              value={textSourceForm.sourceUrl}
            />
          </Field>

          <Field label="原文">
            <Textarea
              onChange={(event) =>
                setTextSourceForm((current) => ({
                  ...current,
                  rawText: event.target.value,
                }))
              }
              placeholder="粘贴面经、知识笔记或简历原文。"
              required
              value={textSourceForm.rawText}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={isSubmitting}
              onClick={() => setTextSubmitMode("save_only")}
              type="submit"
              variant="primary"
            >
              {isSubmitting ? "处理中..." : "保存来源"}
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={() => setTextSubmitMode("save_and_review")}
              type="submit"
            >
              保存并创建解析任务
            </Button>
            <Button href="/review" variant="ghost">
              审核队列
            </Button>
          </div>
        </form>
      ) : null}

      {activeMode === "manual" ? (
        <form className="space-y-5" onSubmit={handleManualQaSubmit}>
          <Field label="题目">
            <Textarea
              className="min-h-[104px]"
              onChange={(event) =>
                setManualQaForm((current) => ({
                  ...current,
                  questionText: event.target.value,
                }))
              }
              placeholder="ThreadLocal 会导致什么问题？"
              required
              value={manualQaForm.questionText}
            />
          </Field>

          <Field label="答案">
            <Textarea
              onChange={(event) =>
                setManualQaForm((current) => ({
                  ...current,
                  answerText: event.target.value,
                }))
              }
              placeholder="在线程池复用线程时，如果不 remove，可能导致脏数据和内存泄漏。"
              required
              value={manualQaForm.answerText}
            />
          </Field>

          <div className="grid gap-4 xl:grid-cols-2">
            <Field label="分类">
              <CreatableMultiSelect
                createText="新建分类"
                createPlaceholder="新分类"
                emptyText="未选择"
                formatOptionLabel={(value) => formatCategoryLabel(value) ?? value}
                onChange={(nextValue) =>
                  setManualQaForm((current) => ({
                    ...current,
                    categories: nextValue,
                  }))
                }
                options={manualQaOptions.categories}
                searchPlaceholder="搜索分类"
                triggerPlaceholder="选择分类"
                value={manualQaForm.categories}
              />
            </Field>

            <Field label="标签">
              <CreatableMultiSelect
                createText="新建标签"
                createPlaceholder="新标签"
                emptyText="未选择"
                formatOptionLabel={(value) => formatTagLabel(value) ?? value}
                onChange={(nextValue) =>
                  setManualQaForm((current) => ({
                    ...current,
                    tags: nextValue,
                  }))
                }
                options={manualQaOptions.tags}
                searchPlaceholder="搜索标签"
                triggerPlaceholder="选择标签"
                value={manualQaForm.tags}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={isSubmitting} type="submit" variant="primary">
              {isSubmitting ? "创建中..." : "创建题目"}
            </Button>
            <Button href="/questions">打开题库</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
