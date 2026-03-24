import { count, eq } from "drizzle-orm";

import { db, sqlite } from "@/server/db/client";
import { chunks } from "@/server/db/schema";
import { createStableOpaqueId, nowUtcIso } from "@/server/repositories/ids";

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

  db.insert(chunks)
    .values({
      id: input.id,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      chunkType: input.chunkType,
      content: trimmedContent,
      tokenCount: estimateTokenCount(trimmedContent),
      sourceOrder: input.sourceOrder ?? null,
      embeddingStatus: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: chunks.id,
      set: {
        content: trimmedContent,
        tokenCount: estimateTokenCount(trimmedContent),
        sourceOrder: input.sourceOrder ?? null,
        updatedAt: timestamp,
      },
    })
    .run();

  return input.id;
}

function deleteChunk(chunkId: string) {
  db.delete(chunks).where(eq(chunks.id, chunkId)).run();
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
    let questionChunkCount = 0;
    let answerChunkCount = 0;

    for (const row of rows) {
      if (
        upsertChunk({
          id: getQuestionTextChunkId(row.questionId),
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
      } else {
        deleteChunk(answerChunkId);
      }
    }

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
    let chunkCount = 0;

    for (const row of rows) {
      if (
        upsertChunk({
          id: getAnswerVariantChunkId(row.answerVariantId),
          ownerType: "answer_variant",
          ownerId: row.answerVariantId,
          chunkType: "answer",
          content: row.content,
        })
      ) {
        chunkCount += 1;
      }
    }

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
    let chunkCount = 0;

    for (const row of rows) {
      const chunkId = getSourceExcerptChunkId(
        row.sourceDocumentId,
        row.questionItemId,
      );

      if (row.sourceSnippet) {
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
      } else {
        deleteChunk(chunkId);
      }
    }

    return {
      chunkCount,
    };
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
