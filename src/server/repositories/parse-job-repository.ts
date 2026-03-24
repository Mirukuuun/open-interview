import {
  and,
  count,
  desc,
  eq,
  like,
  or,
  type InferSelectModel,
} from "drizzle-orm";
import { z } from "zod";

import { parseResultSchema, type ParseResult } from "@/lib/schemas/parse-result";
import { db } from "@/server/db/client";
import { parseJobs, sourceDocuments } from "@/server/db/schema";
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

const listParseJobsInputSchema = z.object({
  status: parseJobStatusSchema.optional(),
  sourceKind: z
    .enum([
      "interview_experience",
      "knowledge_note",
      "resume",
      "manual_input",
    ])
    .optional(),
  query: z.string().min(1).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const listAllParseJobsInputSchema = listParseJobsInputSchema.omit({
  page: true,
  pageSize: true,
});

type ParseJobRow = InferSelectModel<typeof parseJobs>;

export type ParseJobRecord = Omit<ParseJobRow, "resultJson"> & {
  resultJson: ParseResult | null;
};

export type ParseJobListRecord = ParseJobRecord & {
  sourceTitle: string;
  sourceKind: InferSelectModel<typeof sourceDocuments>["kind"];
  sourceParseStatus: InferSelectModel<typeof sourceDocuments>["parseStatus"];
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

function buildParseJobFilters(
  input: z.output<typeof listAllParseJobsInputSchema>,
) {
  const filters = [];

  if (input.status) {
    filters.push(eq(parseJobs.status, input.status));
  }

  if (input.sourceKind) {
    filters.push(eq(sourceDocuments.kind, input.sourceKind));
  }

  if (input.query) {
    const pattern = `%${input.query}%`;

    filters.push(
      or(
        like(sourceDocuments.title, pattern),
        like(sourceDocuments.rawText, pattern),
        like(parseJobs.errorMessage, pattern),
      )!,
    );
  }

  if (filters.length === 0) {
    return undefined;
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return and(...filters)!;
}

function deserializeParseJobListRow(row: {
  parseJob: ParseJobRow;
  sourceDocument: {
    title: string;
    kind: InferSelectModel<typeof sourceDocuments>["kind"];
    parseStatus: InferSelectModel<typeof sourceDocuments>["parseStatus"];
  };
}) {
  const parseJob = deserializeParseJob(row.parseJob);

  if (!parseJob) {
    return undefined;
  }

  return {
    ...parseJob,
    sourceTitle: row.sourceDocument.title,
    sourceKind: row.sourceDocument.kind,
    sourceParseStatus: row.sourceDocument.parseStatus,
  } satisfies ParseJobListRecord;
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

  findLatestBySourceDocumentId(sourceDocumentId: string) {
    const row = db
      .select()
      .from(parseJobs)
      .where(eq(parseJobs.sourceDocumentId, sourceDocumentId))
      .orderBy(desc(parseJobs.createdAt))
      .limit(1)
      .all()[0];

    return deserializeParseJob(row);
  },

  list(input: z.input<typeof listParseJobsInputSchema>) {
    const value = listParseJobsInputSchema.parse(input);
    const whereClause = buildParseJobFilters(value);
    const baseQuery = db
      .select({
        parseJob: parseJobs,
        sourceDocument: {
          title: sourceDocuments.title,
          kind: sourceDocuments.kind,
          parseStatus: sourceDocuments.parseStatus,
        },
      })
      .from(parseJobs)
      .innerJoin(sourceDocuments, eq(parseJobs.sourceDocumentId, sourceDocuments.id));
    const totalQuery = db
      .select({
        count: count(),
      })
      .from(parseJobs)
      .innerJoin(sourceDocuments, eq(parseJobs.sourceDocumentId, sourceDocuments.id));
    const rows = (whereClause ? baseQuery.where(whereClause) : baseQuery)
      .orderBy(desc(parseJobs.updatedAt), desc(parseJobs.createdAt))
      .limit(value.pageSize)
      .offset((value.page - 1) * value.pageSize)
      .all();
    const total = Number(
      (whereClause ? totalQuery.where(whereClause) : totalQuery).all()[0]?.count ?? 0,
    );

    return {
      items: rows
        .map(deserializeParseJobListRow)
        .filter((item): item is ParseJobListRecord => item !== undefined),
      page: value.page,
      pageSize: value.pageSize,
      total,
    };
  },

  listAll(input: z.input<typeof listAllParseJobsInputSchema>) {
    const value = listAllParseJobsInputSchema.parse(input);
    const whereClause = buildParseJobFilters(value);
    const baseQuery = db
      .select({
        parseJob: parseJobs,
        sourceDocument: {
          title: sourceDocuments.title,
          kind: sourceDocuments.kind,
          parseStatus: sourceDocuments.parseStatus,
        },
      })
      .from(parseJobs)
      .innerJoin(sourceDocuments, eq(parseJobs.sourceDocumentId, sourceDocuments.id));
    const rows = (whereClause ? baseQuery.where(whereClause) : baseQuery)
      .orderBy(desc(parseJobs.updatedAt), desc(parseJobs.createdAt))
      .all();

    return rows
      .map(deserializeParseJobListRow)
      .filter((item): item is ParseJobListRecord => item !== undefined);
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
