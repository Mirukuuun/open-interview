import { NextResponse } from "next/server";

import { apiError } from "@/server/api/envelope";
import { BaseServiceError } from "@/server/api/base-service-error";

function sanitizeDetails(details: unknown): unknown {
  if (details == null) return undefined;
  if (typeof details !== "object") return undefined;

  const raw = details as Record<string, unknown>;
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      safe[key] = value.replace(/\/[\w./-]+/g, "[path]");
    } else {
      safe[key] = value;
    }
  }

  return safe;
}

export function toServiceErrorResponse(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof BaseServiceError) {
    return NextResponse.json(
      apiError(error.code, error.message, sanitizeDetails(error.details)),
      { status: error.statusCode },
    );
  }

  return NextResponse.json(
    apiError("internal_error", fallbackMessage),
    { status: 500 },
  );
}
