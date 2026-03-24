import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/client";
import {
  answerVariants,
  questionItems,
  questionTags,
  sourceQuestionRefs,
  tags,
} from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";
import { normalizeQuestionText } from "@/server/repositories/normalization";
import { tagRepository } from "@/server/repositories/tag-repository";

const createQuestionItemInputSchema = z.object({
  id: z.string().min(1).optional(),
  questionText: z.string().min(1),
  normalizedQuestionText: z.string().min(1).optional(),
  canonicalAnswer: z.string().min(1).nullable().optional(),
  category: z.string().min(1).nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  sourceCount: z.number().int().min(0).default(0),
  answerVariantCount: z.number().int().min(0).default(0),
  reviewStatus: z.enum(["draft", "active", "archived"]).default("active"),
  createdFrom: z.enum(["ai_parse", "manual"]).default("manual"),
});

const createAnswerVariantInputSchema = z.object({
  id: z.string().min(1).optional(),
  questionItemId: z.string().min(1),
  variantType: z.enum([
    "canonical",
    "personal",
    "concise",
    "deep_dive",
    "follow_up",
  ]),
  content: z.string().min(1),
  authorType: z.enum(["user", "ai", "system"]),
  status: z.enum(["active", "archived"]).default("active"),
});

const createSourceQuestionRefInputSchema = z.object({
  id: z.string().min(1).optional(),
  sourceDocumentId: z.string().min(1),
  questionItemId: z.string().min(1),
  sourceSnippet: z.string().min(1).nullable().optional(),
  sourceOrder: z.number().int().min(0).nullable().optional(),
});

function getQuestionById(id: string) {
  return db
    .select()
    .from(questionItems)
    .where(eq(questionItems.id, id))
    .limit(1)
    .all()[0];
}

function getQuestionTagRows(questionItemId: string) {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      normalizedName: tags.normalizedName,
      tagType: tags.tagType,
      createdAt: tags.createdAt,
    })
    .from(questionTags)
    .innerJoin(tags, eq(questionTags.tagId, tags.id))
    .where(eq(questionTags.questionItemId, questionItemId))
    .orderBy(tags.name)
    .all();
}

function getAnswerVariantCount(questionItemId: string) {
  return Number(
    db
      .select({ count: count() })
      .from(answerVariants)
      .where(eq(answerVariants.questionItemId, questionItemId))
      .all()[0]?.count ?? 0,
  );
}

function getSourceQuestionRefCount(questionItemId: string) {
  return Number(
    db
      .select({ count: count() })
      .from(sourceQuestionRefs)
      .where(eq(sourceQuestionRefs.questionItemId, questionItemId))
      .all()[0]?.count ?? 0,
  );
}

export const questionRepository = {
  create(input: z.input<typeof createQuestionItemInputSchema>) {
    const value = createQuestionItemInputSchema.parse(input);
    const timestamp = nowUtcIso();
    const questionItem = {
      id: value.id ?? createOpaqueId("q"),
      questionText: value.questionText,
      normalizedQuestionText:
        value.normalizedQuestionText ?? normalizeQuestionText(value.questionText),
      canonicalAnswer: value.canonicalAnswer ?? null,
      category: value.category ?? null,
      difficulty: value.difficulty ?? null,
      sourceCount: value.sourceCount,
      answerVariantCount: value.answerVariantCount,
      reviewStatus: value.reviewStatus,
      createdFrom: value.createdFrom,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.insert(questionItems).values(questionItem).run();

    return questionItem;
  },

  findById(id: string) {
    return getQuestionById(id);
  },

  findByNormalizedText(questionText: string) {
    const normalizedQuestionText = normalizeQuestionText(questionText);

    return db
      .select()
      .from(questionItems)
      .where(eq(questionItems.normalizedQuestionText, normalizedQuestionText))
      .limit(1)
      .all()[0];
  },

  createAnswerVariant(input: z.input<typeof createAnswerVariantInputSchema>) {
    const value = createAnswerVariantInputSchema.parse(input);
    const timestamp = nowUtcIso();
    const answerVariant = {
      id: value.id ?? createOpaqueId("ans"),
      questionItemId: value.questionItemId,
      variantType: value.variantType,
      content: value.content,
      authorType: value.authorType,
      status: value.status,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.insert(answerVariants).values(answerVariant).run();

    db.update(questionItems)
      .set({
        answerVariantCount: getAnswerVariantCount(value.questionItemId),
        updatedAt: timestamp,
      })
      .where(eq(questionItems.id, value.questionItemId))
      .run();

    return answerVariant;
  },

  createSourceQuestionRef(input: z.input<typeof createSourceQuestionRefInputSchema>) {
    const value = createSourceQuestionRefInputSchema.parse(input);
    const sourceQuestionRef = {
      id: value.id ?? createOpaqueId("sqr"),
      sourceDocumentId: value.sourceDocumentId,
      questionItemId: value.questionItemId,
      sourceSnippet: value.sourceSnippet ?? null,
      sourceOrder: value.sourceOrder ?? null,
      createdAt: nowUtcIso(),
    };

    db.insert(sourceQuestionRefs)
      .values(sourceQuestionRef)
      .onConflictDoNothing({
        target: [sourceQuestionRefs.sourceDocumentId, sourceQuestionRefs.questionItemId],
      })
      .run();

    db.update(questionItems)
      .set({
        sourceCount: getSourceQuestionRefCount(value.questionItemId),
        updatedAt: nowUtcIso(),
      })
      .where(eq(questionItems.id, value.questionItemId))
      .run();

    return sourceQuestionRef;
  },

  replaceTags(questionItemId: string, tagNames: string[]) {
    const normalizedTagNames = Array.from(
      new Set(tagNames.map((name) => name.trim()).filter((name) => name.length > 0)),
    );

    db.delete(questionTags)
      .where(eq(questionTags.questionItemId, questionItemId))
      .run();

    if (normalizedTagNames.length === 0) {
      return [];
    }

    const resolvedTags = tagRepository.upsertMany({
      names: normalizedTagNames,
    });

    db.insert(questionTags)
      .values(
        resolvedTags.map((tag) => ({
          questionItemId,
          tagId: tag.id,
        })),
      )
      .onConflictDoNothing()
      .run();

    return getQuestionTagRows(questionItemId);
  },

  listTags(questionItemId: string) {
    return getQuestionTagRows(questionItemId);
  },

  listAnswerVariants(questionItemId: string) {
    return db
      .select()
      .from(answerVariants)
      .where(
        and(
          eq(answerVariants.questionItemId, questionItemId),
          eq(answerVariants.status, "active"),
        ),
      )
      .orderBy(desc(answerVariants.updatedAt))
      .all();
  },
};
