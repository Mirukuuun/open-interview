import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

import {
  createUploadSourceRequestSchema,
  createUploadSourceResponseDataSchema,
} from "@/lib/schemas/import";
import { apiError, apiOk } from "@/server/api/envelope";
import { toServiceErrorResponse } from "@/server/api/service-error";
import { importService } from "@/server/services/import-service";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

function buildUploadNextStep(result: {
  parseJob: {
    id: string;
    status:
      | "pending"
      | "running"
      | "success"
      | "failed"
      | "needs_review"
      | "confirmed";
  } | null;
}) {
  if (!result.parseJob) {
    return {
      kind: "create_parse_job" as const,
      href: "/review",
    };
  }

  if (result.parseJob.status === "failed") {
    return {
      kind: "inspect_parse_failure" as const,
      href: `/review/${result.parseJob.id}`,
    };
  }

  if (
    result.parseJob.status === "pending" ||
    result.parseJob.status === "running"
  ) {
    return {
      kind: "open_review" as const,
      href: "/review",
    };
  }

  return {
    kind: "open_review" as const,
    href: `/review/${result.parseJob.id}`,
  };
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      apiError("invalid_request", "Request body must be valid multipart/form-data."),
      { status: 400 },
    );
  }

  const fileField = formData.get("file");

  if (!(fileField instanceof File) || fileField.size === 0) {
    return NextResponse.json(
      apiError("missing_file", "Upload requires a non-empty file."),
      { status: 400 },
    );
  }

  if (fileField.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      apiError("file_too_large", `Upload exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.`),
      { status: 413 },
    );
  }

  const parseResult = createUploadSourceRequestSchema.safeParse({
    title: formData.get("title") ?? undefined,
    kind: formData.get("kind") ?? undefined,
    source_url: formData.get("source_url") ?? undefined,
    submit_mode: formData.get("submit_mode") ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      apiError("invalid_request", "Invalid upload source payload.", {
        issues: parseResult.error.flatten(),
      }),
      { status: 400 },
    );
  }

  try {
    const submission = await importService.submitUploadedSource({
      title: parseResult.data.title,
      kind: parseResult.data.kind,
      sourceUrl: parseResult.data.source_url ?? null,
      fileName: fileField.name,
      mimeType: fileField.type || null,
      fileBuffer: Buffer.from(await fileField.arrayBuffer()),
      submitMode: parseResult.data.submit_mode,
    });
    const nextStep = buildUploadNextStep(submission);

    const responseData = createUploadSourceResponseDataSchema.parse({
      source_document: {
        id: submission.sourceDocument.id,
        title: submission.sourceDocument.title,
        kind: submission.sourceDocument.kind,
        file_name: submission.sourceDocument.fileName,
        mime_type: submission.sourceDocument.mimeType,
        parse_status: submission.sourceDocument.parseStatus,
      },
      submit_mode: parseResult.data.submit_mode,
      parse_job: submission.parseJob
        ? {
            id: submission.parseJob.id,
            status: submission.parseJob.status,
          }
        : undefined,
      next_step: nextStep,
    });

    return NextResponse.json(apiOk(responseData), { status: 201 });
  } catch (error) {
    return toServiceErrorResponse(error, "Failed to upload source document.");
  }
}
