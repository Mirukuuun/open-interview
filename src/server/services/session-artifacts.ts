import {
  retrievalFinalContextSchema,
  retrievalHitSchema,
  retrievalLogSchema,
  type RetrievalLog,
} from "@/lib/schemas/retrieval";
import { retrievalLogRepository } from "@/server/repositories";

export function truncateSessionText(value: string, maxLength: number) {
  const compactValue = value.replace(/\s+/g, " ").trim();

  if (compactValue.length <= maxLength) {
    return compactValue;
  }

  return `${compactValue.slice(0, maxLength - 3).trimEnd()}...`;
}

export function buildSessionTitle(
  title: string | null | undefined,
  fallbackText: string,
) {
  if (title && title.trim().length > 0) {
    return title.trim();
  }

  return truncateSessionText(fallbackText, 72);
}

export function parseJsonArray<T>(value: string | null | undefined, fallback: T[] = []) {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function parseStoredRetrievalLog(
  retrievalLog: ReturnType<typeof retrievalLogRepository.findById> | null,
): RetrievalLog | null {
  if (!retrievalLog) {
    return null;
  }

  const hits = retrievalHitSchema.array().safeParse(
    parseJsonArray(retrievalLog.hitsJson),
  );
  const finalContext = retrievalFinalContextSchema.safeParse(
    (() => {
      try {
        return JSON.parse(retrievalLog.finalContextJson);
      } catch {
        return {};
      }
    })(),
  );

  if (!hits.success || !finalContext.success) {
    return null;
  }

  return retrievalLogSchema.parse({
    id: retrievalLog.id,
    query_text: retrievalLog.queryText,
    query_type: retrievalLog.queryType,
    strategy: retrievalLog.strategy,
    hits: hits.data,
    final_context: finalContext.data,
    created_at: retrievalLog.createdAt,
  });
}
