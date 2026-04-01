import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/client";
import {
  interviewQuestionLinks,
  interviewQuestions,
  interviewQuestionTags,
  questionItems,
  tags,
} from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";
import { normalizeQuestionText } from "@/server/repositories/normalization";
import { tagRepository } from "@/server/repositories/tag-repository";

/**
 * [POS] 负责面经题、面经题标签以及面经题到题库题正式关联的 SQLite 写入边界。
 * [IN] interview question / link 的创建与标签更新请求。
 * [OUT] 持久化 `interview_question*` 实体，并返回最小化记录用于上层编排。
 *
 * @feature open-interview-interviews-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

const createInterviewQuestionInputSchema = z.object({
  id: z.string().min(1).optional(),
  interviewExperienceId: z.string().min(1),
  sourceDocumentId: z.string().min(1),
  questionText: z.string().min(1),
  normalizedQuestionText: z.string().min(1).optional(),
  sourceAnswer: z.string().min(1).nullable().optional(),
  sourceSnippet: z.string().min(1).nullable().optional(),
  sourceOrder: z.number().int().min(0).nullable().optional(),
  category: z.string().min(1).nullable().optional(),
});

const createInterviewQuestionLinkInputSchema = z.object({
  id: z.string().min(1).optional(),
  interviewQuestionId: z.string().min(1),
  questionItemId: z.string().min(1),
  linkType: z.enum(["promoted_create", "promoted_merge"]),
});

function getInterviewQuestionById(id: string) {
  return db
    .select()
    .from(interviewQuestions)
    .where(eq(interviewQuestions.id, id))
    .limit(1)
    .all()[0];
}

function getInterviewQuestionTagRows(interviewQuestionId: string) {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      normalizedName: tags.normalizedName,
      tagType: tags.tagType,
      createdAt: tags.createdAt,
    })
    .from(interviewQuestionTags)
    .innerJoin(tags, eq(interviewQuestionTags.tagId, tags.id))
    .where(eq(interviewQuestionTags.interviewQuestionId, interviewQuestionId))
    .orderBy(tags.name)
    .all();
}

export const interviewQuestionRepository = {
  create(input: z.input<typeof createInterviewQuestionInputSchema>) {
    const value = createInterviewQuestionInputSchema.parse(input);
    const timestamp = nowUtcIso();
    const interviewQuestion = {
      id: value.id ?? createOpaqueId("iq"),
      interviewExperienceId: value.interviewExperienceId,
      sourceDocumentId: value.sourceDocumentId,
      questionText: value.questionText,
      normalizedQuestionText:
        value.normalizedQuestionText ?? normalizeQuestionText(value.questionText),
      sourceAnswer: value.sourceAnswer ?? null,
      sourceSnippet: value.sourceSnippet ?? null,
      sourceOrder: value.sourceOrder ?? null,
      category: value.category ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.insert(interviewQuestions).values(interviewQuestion).run();

    return interviewQuestion;
  },

  findById(id: string) {
    return getInterviewQuestionById(id);
  },

  replaceTags(interviewQuestionId: string, tagNames: string[]) {
    const cleanedTagNames = Array.from(
      new Set(
        tagNames
          .map((tagName) => tagName.trim())
          .filter((tagName) => tagName.length > 0),
      ),
    );

    db.delete(interviewQuestionTags)
      .where(eq(interviewQuestionTags.interviewQuestionId, interviewQuestionId))
      .run();

    if (cleanedTagNames.length === 0) {
      return [];
    }

    const resolvedTags = tagRepository.upsertMany({
      names: cleanedTagNames,
    });

    db.insert(interviewQuestionTags)
      .values(
        resolvedTags.map((tag) => ({
          interviewQuestionId,
          tagId: tag.id,
        })),
      )
      .onConflictDoNothing()
      .run();

    return getInterviewQuestionTagRows(interviewQuestionId);
  },

  listTags(interviewQuestionId: string) {
    return getInterviewQuestionTagRows(interviewQuestionId);
  },

  createLink(input: z.input<typeof createInterviewQuestionLinkInputSchema>) {
    const value = createInterviewQuestionLinkInputSchema.parse(input);
    const interviewQuestionLink = {
      id: value.id ?? createOpaqueId("iql"),
      interviewQuestionId: value.interviewQuestionId,
      questionItemId: value.questionItemId,
      linkType: value.linkType,
      createdAt: nowUtcIso(),
    };

    db.insert(interviewQuestionLinks)
      .values(interviewQuestionLink)
      .onConflictDoNothing({
        target: [
          interviewQuestionLinks.interviewQuestionId,
          interviewQuestionLinks.questionItemId,
          interviewQuestionLinks.linkType,
        ],
      })
      .run();

    return interviewQuestionLink;
  },

  listLinks(interviewQuestionId: string) {
    return db
      .select({
        id: interviewQuestionLinks.id,
        questionItemId: interviewQuestionLinks.questionItemId,
        linkType: interviewQuestionLinks.linkType,
        createdAt: interviewQuestionLinks.createdAt,
        questionText: questionItems.questionText,
        category: questionItems.category,
      })
      .from(interviewQuestionLinks)
      .innerJoin(
        questionItems,
        eq(interviewQuestionLinks.questionItemId, questionItems.id),
      )
      .where(eq(interviewQuestionLinks.interviewQuestionId, interviewQuestionId))
      .all();
  },
};
