import { and, count, desc, eq, like, or, type InferSelectModel } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/client";
import { sourceDocuments } from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";

const createSourceDocumentInputSchema = z.object({
  id: z.string().min(1).optional(),
  kind: z.enum([
    "interview_experience",
    "knowledge_note",
    "resume",
    "manual_input",
  ]),
  title: z.string().min(1),
  rawText: z.string().min(1),
  fileName: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  filePath: z.string().min(1).optional(),
  sourceUrl: z.string().min(1).nullable().optional(),
  language: z.string().min(1).nullable().optional(),
  status: z.enum(["active", "archived"]).default("active"),
  parseStatus: z
    .enum([
      "not_started",
      "pending",
      "running",
      "needs_review",
      "confirmed",
      "failed",
    ])
    .default("not_started"),
});

const listSourceDocumentsInputSchema = z.object({
  kind: z
    .enum([
      "interview_experience",
      "knowledge_note",
      "resume",
      "manual_input",
    ])
    .optional(),
  parseStatus: z
    .enum([
      "not_started",
      "pending",
      "running",
      "needs_review",
      "confirmed",
      "failed",
    ])
    .optional(),
  query: z.string().min(1).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export type SourceDocumentRecord = InferSelectModel<typeof sourceDocuments>;

function getSourceDocumentById(id: string) {
  return db
    .select()
    .from(sourceDocuments)
    .where(eq(sourceDocuments.id, id))
    .limit(1)
    .all()[0];
}

function buildSourceDocumentFilters(
  input: z.output<typeof listSourceDocumentsInputSchema>,
) {
  const filters = [eq(sourceDocuments.status, "active")];

  if (input.kind) {
    filters.push(eq(sourceDocuments.kind, input.kind));
  }

  if (input.parseStatus) {
    filters.push(eq(sourceDocuments.parseStatus, input.parseStatus));
  }

  if (input.query) {
    const pattern = `%${input.query}%`;
    filters.push(
      or(
        like(sourceDocuments.title, pattern),
        like(sourceDocuments.rawText, pattern),
        like(sourceDocuments.fileName, pattern),
      )!,
    );
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return and(...filters)!;
}

export const sourceDocumentRepository = {
  create(input: z.input<typeof createSourceDocumentInputSchema>) {
    const value = createSourceDocumentInputSchema.parse(input);
    const timestamp = nowUtcIso();
    const sourceDocument = {
      id: value.id ?? createOpaqueId("src"),
      kind: value.kind,
      title: value.title,
      rawText: value.rawText,
      fileName: value.fileName ?? null,
      mimeType: value.mimeType ?? null,
      filePath: value.filePath ?? null,
      sourceUrl: value.sourceUrl ?? null,
      language: value.language ?? null,
      status: value.status,
      parseStatus: value.parseStatus,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.insert(sourceDocuments).values(sourceDocument).run();

    return sourceDocument;
  },

  findById(id: string) {
    return getSourceDocumentById(id);
  },

  listRecent(limit = 10) {
    return db
      .select()
      .from(sourceDocuments)
      .where(eq(sourceDocuments.status, "active"))
      .orderBy(desc(sourceDocuments.createdAt))
      .limit(limit)
      .all();
  },

  list(input: z.input<typeof listSourceDocumentsInputSchema>) {
    const value = listSourceDocumentsInputSchema.parse(input);
    const whereClause = buildSourceDocumentFilters(value);
    const total = Number(
      db
        .select({ count: count() })
        .from(sourceDocuments)
        .where(whereClause)
        .all()[0]?.count ?? 0,
    );

    const items = db
      .select()
      .from(sourceDocuments)
      .where(whereClause)
      .orderBy(desc(sourceDocuments.createdAt))
      .limit(value.pageSize)
      .offset((value.page - 1) * value.pageSize)
      .all();

    return {
      items,
      page: value.page,
      pageSize: value.pageSize,
      total,
    };
  },

  updateParseStatus(
    id: string,
    parseStatus:
      | "not_started"
      | "pending"
      | "running"
      | "needs_review"
      | "confirmed"
      | "failed",
  ) {
    const updatedAt = nowUtcIso();

    db.update(sourceDocuments)
      .set({
        parseStatus,
        updatedAt,
      })
      .where(eq(sourceDocuments.id, id))
      .run();

    return getSourceDocumentById(id);
  },
};
