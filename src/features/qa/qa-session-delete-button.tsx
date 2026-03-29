"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

type QaSessionDeleteButtonProps = {
  sessionId: string;
  title?: string | null;
  active?: boolean;
  className?: string;
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

export function QaSessionDeleteButton({
  sessionId,
  title,
  active = false,
  className,
}: QaSessionDeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const shouldDelete = window.confirm(
      `确认删除会话“${title?.trim() || "未命名会话"}”？删除后会从左侧列表移除。`,
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await readApiResponse(
        await fetch(`/api/qa/sessions/${sessionId}`, {
          method: "DELETE",
        }),
      );

      if (active) {
        router.push("/qa");
        router.refresh();
        return;
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "当前无法删除这个会话。",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      aria-label={`删除会话 ${title?.trim() || sessionId}`}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-sm text-text-muted transition-colors hover:border-border-muted hover:bg-surface-muted hover:text-text-strong disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      disabled={isDeleting}
      onClick={handleDelete}
      type="button"
    >
      {isDeleting ? "…" : "×"}
    </button>
  );
}
