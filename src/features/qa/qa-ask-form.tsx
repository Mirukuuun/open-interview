"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  AskQaSessionResponseData,
  CreateQaSessionResponseData,
} from "@/lib/schemas/qa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type QaAskFormProps = {
  mode: "new" | "existing";
  sessionId?: string;
  initialQuery?: string;
  initialTitle?: string | null;
};

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

export function QaAskForm({
  mode,
  sessionId,
  initialQuery = "",
  initialTitle = "",
}: QaAskFormProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionTitle, setSessionTitle] = useState(initialTitle ?? "");
  const [query, setQuery] = useState(initialQuery);
  const [strategy, setStrategy] = useState<"fts" | "hybrid">("hybrid");
  const [topK, setTopK] = useState("8");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length === 0) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(undefined);

    try {
      let activeSessionId = sessionId;

      if (!activeSessionId) {
        const createResponse = await fetch("/api/qa/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: sessionTitle.trim() || undefined,
          }),
        });
        const sessionData = await readApiResponse<CreateQaSessionResponseData>(
          createResponse,
        );

        activeSessionId = sessionData.ai_session.id;
      }

      const askResponse = await fetch(`/api/qa/sessions/${activeSessionId}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          top_k: Number(topK),
          strategy,
        }),
      });
      const data = await readApiResponse<AskQaSessionResponseData>(askResponse);

      setFeedback({
        tone: "success",
        title: "答案已保存",
        body: `已保存 ${data.citations.length} 条引用，检索日志 ${data.retrieval_log_id}。`,
      });
      setQuery("");

      if (mode === "new") {
        router.push(`/qa/${activeSessionId}`);
        return;
      }

      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "提问失败",
        body:
          error instanceof Error
            ? error.message
            : "当前无法完成这次提问。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">仅引用式回答</Badge>
        <Badge>{strategy}</Badge>
        <Badge>{`top_k=${topK}`}</Badge>
      </div>

      {mode === "new" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-text-strong">会话标题</span>
          <Input
            onChange={(event) => setSessionTitle(event.target.value)}
            placeholder="可选，不填则使用第一条问题"
            value={sessionTitle}
          />
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-strong">问题</span>
        <Textarea
          onChange={(event) => setQuery(event.target.value)}
          placeholder="基于本地题库提问"
          required
          rows={5}
          value={query}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-text-strong">检索策略</span>
          <Select
            onChange={(event) => setStrategy(event.target.value as "fts" | "hybrid")}
            value={strategy}
          >
            <option value="hybrid">混合</option>
            <option value="fts">仅 FTS</option>
          </Select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-text-strong">Top K</span>
          <Select onChange={(event) => setTopK(event.target.value)} value={topK}>
            <option value="4">4</option>
            <option value="6">6</option>
            <option value="8">8</option>
            <option value="12">12</option>
          </Select>
        </label>
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

      <div className="flex flex-wrap gap-3">
        <Button disabled={isSubmitting} type="submit" variant="primary">
          {isSubmitting
            ? mode === "new"
              ? "创建中..."
              : "发送中..."
            : mode === "new"
              ? "在新会话中提问"
              : "继续提问"}
        </Button>
        {mode === "existing" ? <Button href="/qa">新建 QA 会话</Button> : null}
      </div>
    </form>
  );
}
