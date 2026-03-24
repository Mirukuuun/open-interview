import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/client";
import { retrievalLogs } from "@/server/db/schema";
import { createOpaqueId, nowUtcIso } from "@/server/repositories/ids";

const createRetrievalLogInputSchema = z.object({
  id: z.string().min(1).optional(),
  queryText: z.string().min(1),
  queryType: z.enum(["qa", "resume_deep_dive", "mock_interview"]),
  strategy: z.enum(["fts", "vector", "hybrid"]),
  hitsJson: z.string().min(2),
  finalContextJson: z.string().min(2),
});

function getRetrievalLogById(id: string) {
  return db
    .select()
    .from(retrievalLogs)
    .where(eq(retrievalLogs.id, id))
    .limit(1)
    .all()[0];
}

export const retrievalLogRepository = {
  create(input: z.input<typeof createRetrievalLogInputSchema>) {
    const value = createRetrievalLogInputSchema.parse(input);
    const retrievalLog = {
      id: value.id ?? createOpaqueId("ret"),
      queryText: value.queryText,
      queryType: value.queryType,
      strategy: value.strategy,
      hitsJson: value.hitsJson,
      finalContextJson: value.finalContextJson,
      createdAt: nowUtcIso(),
    };

    db.insert(retrievalLogs).values(retrievalLog).run();

    return retrievalLog;
  },

  findById(id: string) {
    return getRetrievalLogById(id);
  },
};
