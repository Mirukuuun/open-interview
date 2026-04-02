"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import type {
  AskQaSessionResponseData,
  CreateQaSessionResponseData,
} from "@/lib/schemas/qa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type QaAskFormProps = {
  sessionId?: string;
  initialQuery?: string;
  hasTurns?: boolean;
  promptSuggestions?: string[];
  mode?: "new" | "existing";
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
  sessionId,
  initialQuery = "",
  hasTurns = false,
  promptSuggestions = [],
}: QaAskFormProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [strategy, setStrategy] = useState<"fts" | "hybrid">("hybrid");
  const [topK, setTopK] = useState("8");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length === 0) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);

    try {
      let activeSessionId = sessionId;

      if (!activeSessionId) {
        const createResponse = await fetch("/api/qa/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        const sessionData = await readApiResponse<CreateQaSessionResponseData>(
          createResponse,
        );

        activeSessionId = sessionData.ai_session.id;
      }

      await readApiResponse<AskQaSessionResponseData>(
        await fetch(`/api/qa/sessions/${activeSessionId}/ask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
            top_k: Number(topK),
            strategy,
          }),
        }),
      );

      setQuery("");

      if (!sessionId) {
        router.push(`/qa/${activeSessionId}`);
        return;
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "当前无法完成这次提问。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function applyPromptSuggestion(suggestion: string) {
    setQuery(suggestion);
    textareaRef.current?.focus();
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="rounded-[28px] border border-border-strong bg-surface-muted p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <Textarea
          className="min-h-[110px] resize-none border-0 bg-transparent px-2 py-2 text-[15px] leading-7 shadow-none focus:border-0 focus-visible:ring-0"
          disabled={isSubmitting}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder={
            hasTurns
              ? "继续追问，或让 AI 改写这轮回答。"
              : "输入你的问题。"
          }
          ref={textareaRef}
          rows={4}
          value={query}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-muted px-2 pt-3">
          <p className="text-xs font-medium text-text-strong">
            {isSubmitting ? "AI 正在整理回答…" : "Enter 发送，Shift + Enter 换行"}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {sessionId ? (
              <Button className="h-10 px-4" href="/qa">
                新会话
              </Button>
            ) : null}
            <Button
              className="h-10 px-4"
              disabled={isSubmitting || query.trim().length === 0}
              type="submit"
              variant="primary"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  思考中...
                </>
              ) : (
                "发送"
              )}
            </Button>
          </div>
        </div>
      </div>

      {!hasTurns && query.trim().length === 0 && promptSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {promptSuggestions.map((suggestion) => (
            <button
              className="interactive-card rounded-full border border-border-muted bg-white px-3 py-2 text-sm text-text-strong focus-visible:outline-none"
              key={suggestion}
              onClick={() => applyPromptSuggestion(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {isSubmitting ? (
        <div className="rounded-[24px] border border-border-strong bg-white px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-text-strong">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
            正在整理 grounded answer
          </div>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      <details className="rounded-2xl border border-border-muted bg-white px-4 py-3">
        <summary className="rounded-lg text-xs font-semibold tracking-[0.14em] text-text-muted uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
          检索选项
        </summary>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-strong">检索策略</span>
            <Select
              disabled={isSubmitting}
              onChange={(event) => setStrategy(event.target.value as "fts" | "hybrid")}
              value={strategy}
            >
              <option value="hybrid">混合检索</option>
              <option value="fts">仅关键词</option>
            </Select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-strong">召回数量</span>
            <Select
              disabled={isSubmitting}
              onChange={(event) => setTopK(event.target.value)}
              value={topK}
            >
              <option value="4">4</option>
              <option value="6">6</option>
              <option value="8">8</option>
              <option value="12">12</option>
            </Select>
          </label>
        </div>
      </details>
    </form>
  );
}
