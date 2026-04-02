"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CreateTextSourceResponseData } from "@/lib/schemas/import";
import type { CreateParseJobResponseData } from "@/lib/schemas/parse-jobs";
import type { CreateResumeFromSourceResponseData } from "@/lib/schemas/resume";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeLabel } from "@/lib/date-time";
import { cn } from "@/lib/utils";

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

type ResumeSourcePanelProps = {
  latestSource: {
    id: string;
    title: string;
    parseStatus: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  latestParseJob: {
    id: string;
    status: string;
    error_message?: string | null;
    updated_at: string;
  } | null;
  parsedProjectPreview: Array<{
    name: string;
    summary: string | null;
    highlights: string[];
    techStack: string[];
    deepDiveQuestions: string[];
  }>;
  parseWarnings: string[];
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

export function ResumeSourcePanel({
  latestSource,
  latestParseJob,
  parsedProjectPreview,
  parseWarnings,
}: ResumeSourcePanelProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    sourceUrl: "",
    rawText: "",
  });

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(undefined);

    try {
      const response = await fetch("/api/sources/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          kind: "resume",
          raw_text: form.rawText,
          source_url: form.sourceUrl || null,
        }),
      });
      const data = await readApiResponse<CreateTextSourceResponseData>(response);

      setFeedback({
        tone: "success",
        title: "简历来源已保存",
        body: `来源 ${data.source_document.id} 已保存，下一步可执行解析。`,
      });
      setForm({
        title: "",
        sourceUrl: "",
        rawText: "",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "保存失败",
        body:
          error instanceof Error
            ? error.message
            : "当前无法保存简历来源。",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleParse() {
    if (!latestSource) {
      return;
    }

    setIsParsing(true);
    setFeedback(undefined);

    try {
      const response = await fetch("/api/parse-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_document_id: latestSource.id,
          job_type: "extract_resume",
        }),
      });
      const data = await readApiResponse<CreateParseJobResponseData>(response);

      setFeedback({
        tone: "success",
        title: "简历已解析",
        body: `任务 ${data.parse_job.id} 当前状态为 ${data.parse_job.status}，可在下方查看项目预览。`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "解析失败",
        body:
          error instanceof Error
            ? error.message
            : "当前无法解析这份简历。",
      });
    } finally {
      setIsParsing(false);
    }
  }

  async function handlePersist() {
    if (!latestSource) {
      return;
    }

    setIsPersisting(true);
    setFeedback(undefined);

    try {
      const response = await fetch("/api/resumes/from-source", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_document_id: latestSource.id,
        }),
      });
      const data = await readApiResponse<CreateResumeFromSourceResponseData>(response);

      setFeedback({
        tone: "success",
        title: "结构化简历已保存",
        body: `已写入 ${data.projects.length} 个项目到简历 ${data.resume_document.id}。`,
      });
      router.push(`/resume/${data.resume_document.id}`);
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "写入失败",
        body:
          error instanceof Error
            ? error.message
            : "当前无法写入结构化简历。",
      });
    } finally {
      setIsPersisting(false);
    }
  }

  const canPersist =
    Boolean(latestSource) &&
    parsedProjectPreview.length > 0 &&
    (latestParseJob?.status === "needs_review" ||
      latestParseJob?.status === "confirmed");

  return (
    <div className="space-y-5">
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

      <form className="space-y-4" onSubmit={handleSave}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-text-strong">简历标题</span>
          <Input
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="后端候选人简历"
            required
            value={form.title}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-text-strong">来源链接</span>
          <Input
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sourceUrl: event.target.value,
              }))
            }
            placeholder="可选"
            value={form.sourceUrl}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-text-strong">简历原文</span>
          <Textarea
            className="min-h-[220px]"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                rawText: event.target.value,
              }))
            }
            placeholder="粘贴简历原文，尤其是项目经历部分。"
            required
            value={form.rawText}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <Button disabled={isSaving} type="submit" variant="primary">
            {isSaving ? "保存中..." : "保存简历来源"}
          </Button>
          <Button href="/import">打开通用导入</Button>
        </div>
      </form>

      <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">当前来源</Badge>
          {latestSource ? <Badge>{latestSource.parseStatus}</Badge> : null}
          {latestParseJob ? <Badge>任务 {latestParseJob.status}</Badge> : null}
        </div>

        {latestSource ? (
          <div className="mt-4 space-y-2 text-sm text-text-muted">
            <p className="font-semibold text-text-strong">{latestSource.title}</p>
            <p className="font-mono text-xs">{latestSource.id}</p>
            <p>更新于 {formatDateTimeLabel(latestSource.updatedAt)}</p>
            {latestParseJob?.error_message ? (
              <p className="text-warning">{latestParseJob.error_message}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-text-muted">
            还没有简历来源。先在上方保存，再执行解析和写入。
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button disabled={!latestSource || isParsing} onClick={handleParse}>
            {isParsing ? "解析中..." : "执行解析"}
          </Button>
          <Button
            disabled={!canPersist || isPersisting}
            onClick={handlePersist}
            variant="primary"
          >
            {isPersisting ? "写入中..." : "写入结构化简历"}
          </Button>
          {latestParseJob ? (
            <Button href={`/review/${latestParseJob.id}`}>打开解析任务</Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">解析预览</Badge>
          <Badge>{`${parsedProjectPreview.length} 个项目`}</Badge>
        </div>
        {parsedProjectPreview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm leading-6 text-text-muted">
            还没有项目预览。解析器更适合有清晰项目区块的简历。
          </div>
        ) : (
          <div className="space-y-3">
            {parsedProjectPreview.map((project) => (
              <div
                className="rounded-xl border border-border-muted bg-white px-4 py-4"
                key={project.name}
              >
                <p className="text-sm font-semibold text-text-strong">{project.name}</p>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {project.summary ?? "还没有项目摘要。"}
                </p>
                {project.techStack.length > 0 ? (
                  <p className="mt-3 text-xs text-text-muted">
                    技术栈: {project.techStack.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {parseWarnings.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-warning">
            {parseWarnings.join(" ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
