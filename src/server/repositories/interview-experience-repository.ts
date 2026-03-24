import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/client";
import { interviewExperiences, interviewTags, tags } from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";
import { searchIndexRepository } from "@/server/repositories/search-index-repository";
import { tagRepository } from "@/server/repositories/tag-repository";

const upsertInterviewExperienceInputSchema = z.object({
  id: z.string().min(1).optional(),
  sourceDocumentId: z.string().min(1),
  company: z.string().min(1).nullable().optional(),
  role: z.string().min(1).nullable().optional(),
  roundInfo: z.string().min(1).nullable().optional(),
  summary: z.string().min(1).nullable().optional(),
  status: z.enum(["active", "archived"]).default("active"),
});

function getInterviewExperienceById(id: string) {
  return db
    .select()
    .from(interviewExperiences)
    .where(eq(interviewExperiences.id, id))
    .limit(1)
    .all()[0];
}

function getInterviewTagRows(interviewExperienceId: string) {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      normalizedName: tags.normalizedName,
      tagType: tags.tagType,
      createdAt: tags.createdAt,
    })
    .from(interviewTags)
    .innerJoin(tags, eq(interviewTags.tagId, tags.id))
    .where(eq(interviewTags.interviewExperienceId, interviewExperienceId))
    .orderBy(tags.name)
    .all();
}

export const interviewExperienceRepository = {
  upsertBySourceDocumentId(
    input: z.input<typeof upsertInterviewExperienceInputSchema>,
  ) {
    const value = upsertInterviewExperienceInputSchema.parse(input);
    const timestamp = nowUtcIso();
    const existing = db
      .select()
      .from(interviewExperiences)
      .where(eq(interviewExperiences.sourceDocumentId, value.sourceDocumentId))
      .limit(1)
      .all()[0];

    if (!existing) {
      const interviewExperience = {
        id: value.id ?? createOpaqueId("intv"),
        sourceDocumentId: value.sourceDocumentId,
        company: value.company ?? null,
        role: value.role ?? null,
        roundInfo: value.roundInfo ?? null,
        summary: value.summary ?? null,
        status: value.status,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      db.insert(interviewExperiences).values(interviewExperience).run();
      searchIndexRepository.upsertInterviewDocument(interviewExperience.id);

      return interviewExperience;
    }

    db.update(interviewExperiences)
      .set({
        company: value.company ?? null,
        role: value.role ?? null,
        roundInfo: value.roundInfo ?? null,
        summary: value.summary ?? null,
        status: value.status,
        updatedAt: timestamp,
      })
      .where(eq(interviewExperiences.id, existing.id))
      .run();

    searchIndexRepository.upsertInterviewDocument(existing.id);

    return getInterviewExperienceById(existing.id);
  },

  findById(id: string) {
    return getInterviewExperienceById(id);
  },

  replaceTags(interviewExperienceId: string, tagNames: string[]) {
    const cleanedTagNames = tagNames
      .map((tagName) => tagName.trim())
      .filter((tagName) => tagName.length > 0);

    db.delete(interviewTags)
      .where(eq(interviewTags.interviewExperienceId, interviewExperienceId))
      .run();

    if (cleanedTagNames.length === 0) {
      searchIndexRepository.upsertInterviewDocument(interviewExperienceId);
      return [];
    }

    const resolvedTags = tagRepository.upsertMany({
      names: cleanedTagNames,
    });

    db.insert(interviewTags)
      .values(
        resolvedTags.map((tag) => ({
          interviewExperienceId,
          tagId: tag.id,
        })),
      )
      .onConflictDoNothing()
      .run();

    searchIndexRepository.upsertInterviewDocument(interviewExperienceId);

    return getInterviewTagRows(interviewExperienceId);
  },

  listTags(interviewExperienceId: string) {
    return getInterviewTagRows(interviewExperienceId);
  },
};
