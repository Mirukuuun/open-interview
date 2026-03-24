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
    throw new Error("Response body is not valid JSON.");
  }

  if (!payload.ok) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
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
        title: "Resume source saved",
        body: `Source ${data.source_document.id} is ready. Run parse next to extract structured projects.`,
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
        title: "Resume source failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to save the resume source right now.",
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
        title: "Resume parsed",
        body: `Parse job ${data.parse_job.id} is now ${data.parse_job.status}. Review the structured project preview below before persisting.`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Resume parse failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to parse the resume source right now.",
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
        title: "Structured resume saved",
        body: `Persisted ${data.projects.length} structured project(s) into resume ${data.resume_document.id}.`,
      });
      router.push(`/resume/${data.resume_document.id}`);
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Structured import failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to persist structured resume entities right now.",
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
          <span className="text-sm font-medium text-text-strong">Resume title</span>
          <Input
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Candidate resume - backend"
            required
            value={form.title}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-text-strong">Source URL</span>
          <Input
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sourceUrl: event.target.value,
              }))
            }
            placeholder="Optional"
            value={form.sourceUrl}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-text-strong">Raw resume text</span>
          <Textarea
            className="min-h-[220px]"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                rawText: event.target.value,
              }))
            }
            placeholder="Paste the raw resume text, especially the project section."
            required
            value={form.rawText}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <Button disabled={isSaving} type="submit" variant="primary">
            {isSaving ? "Saving..." : "Save resume source"}
          </Button>
          <Button href="/import">Open generic import</Button>
        </div>
      </form>

      <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Current source</Badge>
          {latestSource ? <Badge>{latestSource.parseStatus}</Badge> : null}
          {latestParseJob ? <Badge>job {latestParseJob.status}</Badge> : null}
        </div>

        {latestSource ? (
          <div className="mt-4 space-y-2 text-sm text-text-muted">
            <p className="font-semibold text-text-strong">{latestSource.title}</p>
            <p className="font-mono text-xs">{latestSource.id}</p>
            <p>updated {formatDateTime(latestSource.updatedAt)}</p>
            {latestParseJob?.error_message ? (
              <p className="text-warning">{latestParseJob.error_message}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-text-muted">
            No resume source has been saved yet. Paste one above, then run parse and
            persist the structured project entities.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button disabled={!latestSource || isParsing} onClick={handleParse}>
            {isParsing ? "Parsing..." : "Run resume parse"}
          </Button>
          <Button
            disabled={!canPersist || isPersisting}
            onClick={handlePersist}
            variant="primary"
          >
            {isPersisting ? "Persisting..." : "Persist structured resume"}
          </Button>
          {latestParseJob ? (
            <Button href={`/review/${latestParseJob.id}`}>Open parse job</Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Parsed preview</Badge>
          <Badge>{`${parsedProjectPreview.length} project(s)`}</Badge>
        </div>
        {parsedProjectPreview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-white px-4 py-4 text-sm leading-6 text-text-muted">
            No parsed project preview is available yet. The parser expects clear project
            blocks or a dedicated projects section.
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
                  {project.summary ?? "No summary extracted."}
                </p>
                {project.techStack.length > 0 ? (
                  <p className="mt-3 text-xs text-text-muted">
                    stack: {project.techStack.join(", ")}
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
