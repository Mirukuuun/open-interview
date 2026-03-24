import { eq, type InferSelectModel } from "drizzle-orm";
import { z } from "zod";

import { parseResultSchema, type ParseResult } from "@/lib/schemas/parse-result";
import { db } from "@/server/db/client";
import { parseJobs } from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";

const parseJobStatusSchema = z.enum([
  "pending",
  "running",
  "success",
  "failed",
  "needs_review",
  "confirmed",
]);

const createParseJobInputSchema = z.object({
  id: z.string().min(1).optional(),
  sourceDocumentId: z.string().min(1),
  jobType: z.enum([
    "extract_interview",
    "extract_resume",
    "normalize_manual_input",
  ]),
  provider: z.literal("openclaw").default("openclaw"),
  status: parseJobStatusSchema.default("pending"),
  attemptCount: z.number().int().min(0).default(0),
  promptVersion: z.string().min(1).nullable().optional(),
  errorMessage: z.string().min(1).nullable().optional(),
  resultJson: parseResultSchema.nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
});

const updateParseJobInputSchema = z.object({
  status: parseJobStatusSchema.optional(),
  attemptCount: z.number().int().min(0).optional(),
  promptVersion: z.string().min(1).nullable().optional(),
  errorMessage: z.string().min(1).nullable().optional(),
  resultJson: parseResultSchema.nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
});

type ParseJobRow = InferSelectModel<typeof parseJobs>;

export type ParseJobRecord = Omit<ParseJobRow, "resultJson"> & {
  resultJson: ParseResult | null;
};

function deserializeParseJob(row: ParseJobRow | undefined) {
  if (!row) {
    return undefined;
  }

  return {
    ...row,
    resultJson:
      row.resultJson === null ? null : parseResultSchema.parse(JSON.parse(row.resultJson)),
  } satisfies ParseJobRecord;
}

function getParseJobById(id: string) {
  const row = db
    .select()
    .from(parseJobs)
    .where(eq(parseJobs.id, id))
    .limit(1)
    .all()[0];

  return deserializeParseJob(row);
}

export const parseJobRepository = {
  create(input: z.input<typeof createParseJobInputSchema>) {
    const value = createParseJobInputSchema.parse(input);
    const timestamp = nowUtcIso();
    const parseJob = {
      id: value.id ?? createOpaqueId("job"),
      sourceDocumentId: value.sourceDocumentId,
      jobType: value.jobType,
      provider: value.provider,
      status: value.status,
      attemptCount: value.attemptCount,
      promptVersion: value.promptVersion ?? null,
      errorMessage: value.errorMessage ?? null,
      resultJson: value.resultJson ? JSON.stringify(value.resultJson) : null,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: value.startedAt ?? null,
      finishedAt: value.finishedAt ?? null,
    };

    db.insert(parseJobs).values(parseJob).run();

    return deserializeParseJob(parseJob);
  },

  findById(id: string) {
    return getParseJobById(id);
  },

  update(id: string, input: z.input<typeof updateParseJobInputSchema>) {
    const value = updateParseJobInputSchema.parse(input);

    db.update(parseJobs)
      .set({
        ...(value.status === undefined ? {} : { status: value.status }),
        ...(value.attemptCount === undefined
          ? {}
          : { attemptCount: value.attemptCount }),
        ...(value.promptVersion === undefined
          ? {}
          : { promptVersion: value.promptVersion }),
        ...(value.errorMessage === undefined
          ? {}
          : { errorMessage: value.errorMessage }),
        ...(value.resultJson === undefined
          ? {}
          : {
              resultJson:
                value.resultJson === null ? null : JSON.stringify(value.resultJson),
            }),
        ...(value.startedAt === undefined ? {} : { startedAt: value.startedAt }),
        ...(value.finishedAt === undefined ? {} : { finishedAt: value.finishedAt }),
        updatedAt: nowUtcIso(),
      })
      .where(eq(parseJobs.id, id))
      .run();

    return getParseJobById(id);
  },
};
