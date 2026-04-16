"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AskResumeProjectSessionResponseData } from "@/lib/schemas/resume";
import { Button } from "@/components/ui/button";
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

type DeepDiveAnswerFormProps = {
  projectId: string;
  sessionId: string;
};

export function DeepDiveAnswerForm({
  projectId,
  sessionId,
}: DeepDiveAnswerFormProps) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (answer.trim().length === 0) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(undefined);

    try {
      const response = await fetch(
        `/api/resume-projects/${projectId}/deep-dive-sessions/${sessionId}/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answer: answer.trim(),
          }),
        },
      );
      const data = await readApiResponse<AskResumeProjectSessionResponseData>(response);

      setFeedback({
        tone: "success",
        title: "回答已保存",
        body: `下一题已准备好，包含 ${data.coach_hints.length} 条提示和检索日志 ${data.retrieval_log_id}。`,
      });
      setAnswer("");
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "继续深挖失败",
        body:
          error instanceof Error
            ? error.message
            : "当前无法继续这次深挖。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[color:var(--color-foreground)]">你的回答</span>
        <Textarea
          className="min-h-[140px]"
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="结合你的职责、权衡和结果来回答当前问题。"
          required
          value={answer}
        />
      </label>

      {feedback ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-4",
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50",
          )}
        >
          <p className="text-sm font-semibold text-[color:var(--color-foreground)]">{feedback.title}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted-foreground)]">{feedback.body}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button disabled={isSubmitting} type="submit" variant="primary">
          {isSubmitting ? "提交中..." : "提交回答"}
        </Button>
        <Button href={`/resume/projects/${projectId}`}>返回项目</Button>
      </div>
    </form>
  );
}
