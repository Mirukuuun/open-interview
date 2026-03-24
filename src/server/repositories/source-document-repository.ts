import { desc, eq } from "drizzle-orm";
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

function getSourceDocumentById(id: string) {
  return db
    .select()
    .from(sourceDocuments)
    .where(eq(sourceDocuments.id, id))
    .limit(1)
    .all()[0];
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
      .orderBy(desc(sourceDocuments.createdAt))
      .limit(limit)
      .all();
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
