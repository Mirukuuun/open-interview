"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CreateManualQaResponseData,
  CreateTextSourceResponseData,
} from "@/lib/schemas/import";
import type { CreateParseJobResponseData } from "@/lib/schemas/parse-jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { CreatableMultiSelect } from "./creatable-multi-select";

type ImportMode = "upload" | "paste" | "manual";
type TextSubmitMode = "save_only" | "save_and_review";

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

  const [textSourceForm, setTextSourceForm] = useState({
    title: "",
    kind: "interview_experience",
    sourceUrl: "",
    rawText: "",
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
        </div>
      ) : null}

      {activeMode === "upload" ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface-muted p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">暂缓</Badge>
            <p className="text-sm font-semibold text-text-strong">文件上传本轮不展开。</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                setActiveMode("manual");
                setFeedback(undefined);
              }}
              variant="primary"
            >
              切到手工录入
            </Button>
            <Button href="/review">打开审核队列</Button>
          </div>
        </div>
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
                    kind: event.target.value,
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
