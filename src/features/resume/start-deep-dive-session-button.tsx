"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CreateResumeProjectSessionResponseData } from "@/lib/schemas/resume";
import { Button } from "@/components/ui/button";

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
    throw new Error("Response body is not valid JSON.");
  }

  if (!payload.ok) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}

type StartDeepDiveSessionButtonProps = {
  projectId: string;
  label?: string;
};

export function StartDeepDiveSessionButton({
  projectId,
  label = "Start deep dive",
}: StartDeepDiveSessionButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleClick() {
    setIsCreating(true);

    try {
      const response = await fetch(
        `/api/resume-projects/${projectId}/deep-dive-sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "resume_deep_dive",
          }),
        },
      );
      const data = await readApiResponse<CreateResumeProjectSessionResponseData>(response);

      router.push(`/resume/projects/${projectId}/session/${data.ai_session.id}`);
      router.refresh();
    } catch {
      setIsCreating(false);
      return;
    }
  }

  return (
    <Button disabled={isCreating} onClick={handleClick} variant="primary">
      {isCreating ? "Creating..." : label}
    </Button>
  );
}
