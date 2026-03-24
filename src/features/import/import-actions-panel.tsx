"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CreateManualQaResponseData,
  CreateTextSourceResponseData,
} from "@/lib/schemas/import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ImportMode = "upload" | "paste" | "manual";

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

const importModes: Array<{
  id: ImportMode;
  title: string;
  description: string;
}> = [
  {
    id: "upload",
    title: "Upload",
    description: "Keep the file lane visible, but defer the actual upload surface.",
  },
  {
    id: "paste",
    title: "Paste Text",
    description: "Save raw source text now and hand it off toward parse/review.",
  },
  {
    id: "manual",
    title: "Manual Q&A",
    description: "Write a reviewed question-answer pair straight into canonical storage.",
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

export function ImportActionsPanel() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<ImportMode>("paste");
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [textSourceForm, setTextSourceForm] = useState({
    title: "",
    kind: "interview_experience",
    sourceUrl: "",
    rawText: "",
  });

  const [manualQaForm, setManualQaForm] = useState({
    questionText: "",
    answerText: "",
    category: "",
    tags: "",
  });

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

      setFeedback({
        tone: "success",
        title: "Text source saved",
        body: `Source ${data.source_document.id} is ready with parse_status=${data.source_document.parse_status}. Open Review Queue as the next step.`,
      });

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
        title: "Text source failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to save the pasted source right now.",
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
          category: manualQaForm.category || null,
          tags: manualQaForm.tags
            .split(/[,，]/)
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        }),
      });

      const data = await readApiResponse<CreateManualQaResponseData>(response);

      setFeedback({
        tone: "success",
        title: "Manual Q&A created",
        body: `Question ${data.question_item.id} and answer ${data.answer_variant.id} are stored. A confirmed manual source was also written for traceability.`,
      });

      setManualQaForm({
        questionText: "",
        answerText: "",
        category: "",
        tags: "",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Manual Q&A failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to create the manual question right now.",
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
                {isActive ? <Badge tone="accent">Active</Badge> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {mode.description}
              </p>
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
            <Badge tone="warning">Deferred</Badge>
            <p className="text-sm font-semibold text-text-strong">
              File upload stays out of Slice 2.
            </p>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            To keep the MVP ingestion loop tight, this slice ships the pasted-text
            and manual-Q&A lanes first. If you need to ingest content right now, use
            Paste Text and keep the file upload surface for the next slice.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                setActiveMode("paste");
                setFeedback(undefined);
              }}
              variant="primary"
            >
              Switch to Paste Text
            </Button>
            <Button href="/review">Open Review Queue</Button>
          </div>
        </div>
      ) : null}

      {activeMode === "paste" ? (
        <form className="space-y-5" onSubmit={handleTextSourceSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              description="Use a concise operator-facing title so the source is easy to scan later."
              label="Title"
            >
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

            <Field
              description="Choose the raw source kind now. Manual input has its own dedicated mode."
              label="Kind"
            >
              <Select
                onChange={(event) =>
                  setTextSourceForm((current) => ({
                    ...current,
                    kind: event.target.value,
                  }))
                }
                value={textSourceForm.kind}
              >
                <option value="interview_experience">Interview experience</option>
                <option value="knowledge_note">Knowledge note</option>
                <option value="resume">Resume</option>
              </Select>
            </Field>
          </div>

          <Field
            description="Optional reference URL. Leave blank when the source only exists in copied text."
            label="Source URL"
          >
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

          <Field
            description="Paste the raw material as-is so the later parse/review flow has the original truth source."
            label="Raw text"
          >
            <Textarea
              onChange={(event) =>
                setTextSourceForm((current) => ({
                  ...current,
                  rawText: event.target.value,
                }))
              }
              placeholder="粘贴面经、知识笔记、或简历原文。"
              required
              value={textSourceForm.rawText}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={isSubmitting} type="submit" variant="primary">
              {isSubmitting ? "Saving..." : "Save Source"}
            </Button>
            <Button href="/review">Open Review Queue</Button>
            <p className="text-sm text-text-muted">
              Raw source 保存后会立刻出现在 recent list；现在也可以直接去 Review
              Queue 创建 parse job。
            </p>
          </div>
        </form>
      ) : null}

      {activeMode === "manual" ? (
        <form className="space-y-5" onSubmit={handleManualQaSubmit}>
          <Field
            description="Write the canonical question text you want to keep in the question bank."
            label="Question"
          >
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

          <Field
            description="This becomes the first answer variant. Existing questions keep their canonical answer unless it is still empty."
            label="Answer"
          >
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

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              description="Optional taxonomy bucket for the canonical question."
              label="Category"
            >
              <Input
                onChange={(event) =>
                  setManualQaForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                placeholder="java_concurrency"
                value={manualQaForm.category}
              />
            </Field>

            <Field
              description="Comma-separated tags. They merge into the question's tag set."
              label="Tags"
            >
              <Input
                onChange={(event) =>
                  setManualQaForm((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
                placeholder="threadlocal, java"
                value={manualQaForm.tags}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={isSubmitting} type="submit" variant="primary">
              {isSubmitting ? "Creating..." : "Create Question"}
            </Button>
            <Button href="/questions">Open Question Bank</Button>
            <p className="text-sm text-text-muted">
              This path also writes a confirmed `manual_input` source so the question
              keeps a raw origin record.
            </p>
          </div>
        </form>
      ) : null}
    </div>
  );
}
