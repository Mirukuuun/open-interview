import { count, eq, inArray } from "drizzle-orm";

import { db, sqlite } from "@/server/db/client";
import { chunks } from "@/server/db/schema";
import { createStableOpaqueId, nowUtcIso } from "@/server/repositories/ids";
import { parseJsonStringArray } from "@/server/repositories/search-helpers";
import { vectorSyncRepository } from "@/server/repositories/vector-sync-repository";

/**
 * [POS] 维护 retrieval chunk 的稳定 ID、SQLite chunk 真相表，以及和 Milvus foundation 对齐的增删边界。
 * [IN] canonical question / answer / source / resume_project 数据。
 * [OUT] 持久化 chunks 表，必要时为 Milvus 删除同步排队。
 *
 * @feature open-interview-server-core-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

function estimateTokenCount(content: string) {
  const trimmedContent = content.trim();

  if (trimmedContent.length === 0) {
    return null;
  }

  return Math.max(1, Math.ceil(trimmedContent.length / 4));
}

function buildChunkId(seed: string) {
  return createStableOpaqueId("chunk", seed);
}

export function getQuestionTextChunkId(questionId: string) {
  return buildChunkId(`question_item:${questionId}:question`);
}

export function getQuestionAnswerChunkId(questionId: string) {
  return buildChunkId(`question_item:${questionId}:answer`);
}

export function getAnswerVariantChunkId(answerVariantId: string) {
  return buildChunkId(`answer_variant:${answerVariantId}:answer`);
}

export function getSourceExcerptChunkId(
  sourceDocumentId: string,
  questionItemId: string,
) {
  return buildChunkId(
    `source_document:${sourceDocumentId}:source_excerpt:${questionItemId}`,
  );
}

export function getResumeProjectSummaryChunkId(projectId: string) {
  return buildChunkId(`resume_project:${projectId}:project_summary`);
}

function upsertChunk(input: {
  id: string;
  ownerType: "source_document" | "question_item" | "answer_variant" | "resume_project";
  ownerId: string;
  chunkType: "source_excerpt" | "question" | "answer" | "project_summary";
  content: string;
  sourceOrder?: number | null;
}) {
  const timestamp = nowUtcIso();
  const trimmedContent = input.content.trim();

  if (trimmedContent.length === 0) {
    return null;
  }

  const tokenCount = estimateTokenCount(trimmedContent);
  const sourceOrder = input.sourceOrder ?? null;
  const existingChunk = db
    .select()
    .from(chunks)
    .where(eq(chunks.id, input.id))
    .limit(1)
    .all()[0];

  if (!existingChunk) {
    db.insert(chunks)
      .values({
        id: input.id,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        chunkType: input.chunkType,
        content: trimmedContent,
        tokenCount,
        sourceOrder,
        embeddingStatus: "pending",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    return input.id;
  }

  const contentChanged =
    existingChunk.content !== trimmedContent ||
    existingChunk.tokenCount !== tokenCount ||
    existingChunk.sourceOrder !== sourceOrder ||
    existingChunk.ownerType !== input.ownerType ||
    existingChunk.ownerId !== input.ownerId ||
    existingChunk.chunkType !== input.chunkType;

  if (!contentChanged) {
    return input.id;
  }

  db.update(chunks)
    .set({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      chunkType: input.chunkType,
      content: trimmedContent,
      tokenCount,
      sourceOrder,
      embeddingStatus: "pending",
      updatedAt: timestamp,
    })
    .where(eq(chunks.id, input.id))
    .run();

  return input.id;
}

function deleteChunk(chunkId: string) {
  vectorSyncRepository.enqueueChunkDelete({
    chunkId,
  });
  db.delete(chunks).where(eq(chunks.id, chunkId)).run();
}

function pruneChunks(existingChunkIds: string[], expectedChunkIds: Set<string>) {
  for (const chunkId of existingChunkIds) {
    if (!expectedChunkIds.has(chunkId)) {
      deleteChunk(chunkId);
    }
  }
}

function listChunkIdsByOwnerType(
  ownerType: "question_item" | "answer_variant" | "resume_project",
) {
  return db
    .select({
      id: chunks.id,
    })
    .from(chunks)
    .where(eq(chunks.ownerType, ownerType))
    .all()
    .map((row) => row.id);
}

function listChunkIdsByChunkType(chunkType: "source_excerpt") {
  return db
    .select({
      id: chunks.id,
    })
    .from(chunks)
    .where(eq(chunks.chunkType, chunkType))
    .all()
    .map((row) => row.id);
}

export const chunkRepository = {
  syncQuestionChunks() {
    const rows = sqlite.prepare(`
      SELECT
        q.id AS questionId,
        q.question_text AS questionText,
        q.canonical_answer AS canonicalAnswer
      FROM question_items q
      WHERE q.review_status = 'active'
    `).all() as Array<{
      questionId: string;
      questionText: string;
      canonicalAnswer: string | null;
    }>;
    const expectedChunkIds = new Set<string>();
    let questionChunkCount = 0;
    let answerChunkCount = 0;

    for (const row of rows) {
      const questionChunkId = getQuestionTextChunkId(row.questionId);

      expectedChunkIds.add(questionChunkId);
      if (
        upsertChunk({
          id: questionChunkId,
          ownerType: "question_item",
          ownerId: row.questionId,
          chunkType: "question",
          content: row.questionText,
        })
      ) {
        questionChunkCount += 1;
      }

      const answerChunkId = getQuestionAnswerChunkId(row.questionId);

      if (row.canonicalAnswer) {
        expectedChunkIds.add(answerChunkId);
        if (
          upsertChunk({
            id: answerChunkId,
            ownerType: "question_item",
            ownerId: row.questionId,
            chunkType: "answer",
            content: row.canonicalAnswer,
          })
        ) {
          answerChunkCount += 1;
        }
      }
    }

    pruneChunks(listChunkIdsByOwnerType("question_item"), expectedChunkIds);

    return {
      questionChunkCount,
      answerChunkCount,
    };
  },

  syncAnswerVariantChunks() {
    const rows = sqlite.prepare(`
      SELECT
        av.id AS answerVariantId,
        av.question_item_id AS questionItemId,
        av.content AS content
      FROM answer_variants av
      INNER JOIN question_items q
        ON q.id = av.question_item_id
      WHERE av.status = 'active'
        AND q.review_status = 'active'
    `).all() as Array<{
      answerVariantId: string;
      questionItemId: string;
      content: string;
    }>;
    const expectedChunkIds = new Set<string>();
    let chunkCount = 0;

    for (const row of rows) {
      const chunkId = getAnswerVariantChunkId(row.answerVariantId);

      expectedChunkIds.add(chunkId);
      if (
        upsertChunk({
          id: chunkId,
          ownerType: "answer_variant",
          ownerId: row.answerVariantId,
          chunkType: "answer",
          content: row.content,
        })
      ) {
        chunkCount += 1;
      }
    }

    pruneChunks(listChunkIdsByOwnerType("answer_variant"), expectedChunkIds);

    return {
      chunkCount,
    };
  },

  syncSourceExcerptChunks() {
    const rows = sqlite.prepare(`
      SELECT
        sqr.source_document_id AS sourceDocumentId,
        sqr.question_item_id AS questionItemId,
        sqr.source_snippet AS sourceSnippet,
        sqr.source_order AS sourceOrder,
        sd.status AS sourceStatus
      FROM source_question_refs sqr
      INNER JOIN source_documents sd
        ON sd.id = sqr.source_document_id
      INNER JOIN question_items q
        ON q.id = sqr.question_item_id
      WHERE sd.status = 'active'
        AND q.review_status = 'active'
    `).all() as Array<{
      sourceDocumentId: string;
      questionItemId: string;
      sourceSnippet: string | null;
      sourceOrder: number | null;
      sourceStatus: "active" | "archived";
    }>;
    const expectedChunkIds = new Set<string>();
    let chunkCount = 0;

    for (const row of rows) {
      const chunkId = getSourceExcerptChunkId(
        row.sourceDocumentId,
        row.questionItemId,
      );

      if (row.sourceSnippet) {
        expectedChunkIds.add(chunkId);
        if (
          upsertChunk({
            id: chunkId,
            ownerType: "source_document",
            ownerId: row.sourceDocumentId,
            chunkType: "source_excerpt",
            content: row.sourceSnippet,
            sourceOrder: row.sourceOrder,
          })
        ) {
          chunkCount += 1;
        }
      }
    }

    pruneChunks(listChunkIdsByChunkType("source_excerpt"), expectedChunkIds);

    return {
      chunkCount,
    };
  },

  syncResumeProjectChunks() {
    const rows = sqlite.prepare(`
      SELECT
        rp.id AS projectId,
        rp.name AS name,
        rp.summary AS summary,
        rp.highlights_json AS highlightsJson,
        rp.tech_stack_json AS techStackJson,
        rp.deep_dive_questions_json AS deepDiveQuestionsJson
      FROM resume_projects rp
      INNER JOIN resume_documents rd
        ON rd.id = rp.resume_document_id
      INNER JOIN source_documents sd
        ON sd.id = rd.source_document_id
      WHERE sd.status = 'active'
    `).all() as Array<{
      projectId: string;
      name: string;
      summary: string | null;
      highlightsJson: string | null;
      techStackJson: string | null;
      deepDiveQuestionsJson: string | null;
    }>;
    const expectedChunkIds = new Set<string>();
    let chunkCount = 0;

    for (const row of rows) {
      const parts = [
        row.name,
        row.summary,
        ...parseJsonStringArray(row.highlightsJson),
        parseJsonStringArray(row.techStackJson).length > 0
          ? `Tech stack: ${parseJsonStringArray(row.techStackJson).join(", ")}`
          : null,
        ...parseJsonStringArray(row.deepDiveQuestionsJson).map(
          (question) => `Deep dive: ${question}`,
        ),
      ].filter((value): value is string => Boolean(value && value.trim()));
      const chunkId = getResumeProjectSummaryChunkId(row.projectId);

      expectedChunkIds.add(chunkId);
      if (
        upsertChunk({
          id: chunkId,
          ownerType: "resume_project",
          ownerId: row.projectId,
          chunkType: "project_summary",
          content: parts.join("\n"),
        })
      ) {
        chunkCount += 1;
      }
    }

    pruneChunks(listChunkIdsByOwnerType("resume_project"), expectedChunkIds);

    return {
      chunkCount,
    };
  },

  listQaChunks() {
    return db
      .select({
        id: chunks.id,
        ownerType: chunks.ownerType,
        ownerId: chunks.ownerId,
        chunkType: chunks.chunkType,
        content: chunks.content,
        tokenCount: chunks.tokenCount,
        sourceOrder: chunks.sourceOrder,
        embeddingStatus: chunks.embeddingStatus,
        updatedAt: chunks.updatedAt,
      })
      .from(chunks)
      .where(inArray(chunks.chunkType, ["question", "answer", "source_excerpt"]))
      .all();
  },

  countByChunkType() {
    const questionCount = Number(
      db
        .select({ count: count() })
        .from(chunks)
        .where(eq(chunks.chunkType, "question"))
        .all()[0]?.count ?? 0,
    );
    const answerCount = Number(
      db
        .select({ count: count() })
        .from(chunks)
        .where(eq(chunks.chunkType, "answer"))
        .all()[0]?.count ?? 0,
    );
    const sourceExcerptCount = Number(
      db
        .select({ count: count() })
        .from(chunks)
        .where(eq(chunks.chunkType, "source_excerpt"))
        .all()[0]?.count ?? 0,
    );

    return {
      questionCount,
      answerCount,
      sourceExcerptCount,
    };
  },
};
