import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/client";
import { tags } from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";
import { normalizeTagName } from "@/server/repositories/normalization";

const upsertTagsInputSchema = z.object({
  names: z.array(z.string().min(1)),
  tagType: z.enum(["topic", "company", "role", "skill", "custom"]).default("custom"),
});

export const tagRepository = {
  upsertMany(input: z.input<typeof upsertTagsInputSchema>) {
    const value = upsertTagsInputSchema.parse(input);
    const uniqueNames = Array.from(
      new Map(
        value.names
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
          .map((name) => [normalizeTagName(name), name]),
      ).entries(),
    );

    if (uniqueNames.length === 0) {
      return [];
    }

    const now = nowUtcIso();

    db.insert(tags)
      .values(
        uniqueNames.map(([normalizedName, name]) => ({
          id: createOpaqueId("tag"),
          name,
          normalizedName,
          tagType: value.tagType,
          createdAt: now,
        })),
      )
      .onConflictDoNothing({
        target: tags.normalizedName,
      })
      .run();

    return db
      .select()
      .from(tags)
      .where(
        inArray(
          tags.normalizedName,
          uniqueNames.map(([normalizedName]) => normalizedName),
        ),
      )
      .all();
  },

  findByNormalizedName(normalizedName: string) {
    return db
      .select()
      .from(tags)
      .where(eq(tags.normalizedName, normalizedName))
      .limit(1)
      .all()[0];
  },
};
