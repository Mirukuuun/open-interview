import { z } from "zod";

export const sourceDocumentKindSchema = z.enum([
  "interview_experience",
  "knowledge_note",
  "resume",
  "manual_input",
]);

export const ingestableSourceDocumentKindSchema = z.enum([
  "interview_experience",
  "knowledge_note",
  "resume",
]);

export const sourceDocumentParseStatusSchema = z.enum([
  "not_started",
  "pending",
  "running",
  "needs_review",
  "confirmed",
  "failed",
]);

function coerceNullableString(value: unknown) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function coerceOptionalEnum<const TValues extends readonly [string, ...string[]]>(
  values: TValues,
): z.ZodType<TValues[number] | undefined> {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    return values.includes(value as TValues[number]) ? value : undefined;
  }, z.enum(values).optional());
}

function coercePositiveInteger(defaultValue: number, maxValue: number) {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return defaultValue;
      }

      const numericValue = Number(value);

      if (!Number.isInteger(numericValue) || numericValue < 1) {
        return defaultValue;
      }

      if (numericValue > maxValue) {
        return maxValue;
      }

      return numericValue;
    },
    z.number().int().min(1).max(maxValue),
  );
}

function dedupeStringArray(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

export const createTextSourceRequestSchema = z.object({
  title: z.string().trim().min(1),
  kind: ingestableSourceDocumentKindSchema,
  raw_text: z.string().trim().min(1),
  source_url: z.preprocess(
    coerceNullableString,
    z.string().min(1).nullable().optional(),
  ),
});

export const createManualQaRequestSchema = z.object({
  question_text: z.string().trim().min(1),
  answer_text: z.string().trim().min(1),
  categories: z.array(z.string()).default([]).transform(dedupeStringArray),
  tags: z.array(z.string()).default([]).transform(dedupeStringArray),
});

export const listSourcesQuerySchema = z.object({
  kind: coerceOptionalEnum([
    "interview_experience",
    "knowledge_note",
    "resume",
    "manual_input",
  ]),
  parse_status: coerceOptionalEnum([
    "not_started",
    "pending",
    "running",
    "needs_review",
    "confirmed",
    "failed",
  ]),
  q: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmedValue = value.trim();

      return trimmedValue.length > 0 ? trimmedValue : undefined;
    },
    z.string().min(1).optional(),
  ),
  page: coercePositiveInteger(1, 999),
  page_size: coercePositiveInteger(10, 50),
});

export const sourceDocumentListItemSchema = z.object({
  id: z.string().min(1),
  kind: sourceDocumentKindSchema,
  title: z.string().min(1),
  file_name: z.string().min(1).nullable().optional(),
  source_url: z.string().min(1).nullable().optional(),
  parse_status: sourceDocumentParseStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const listSourcesResponseDataSchema = z.object({
  items: z.array(sourceDocumentListItemSchema),
  page: z.number().int().min(1),
  page_size: z.number().int().min(1),
  total: z.number().int().min(0),
});

export const createTextSourceResponseDataSchema = z.object({
  source_document: z.object({
    id: z.string().min(1),
    parse_status: sourceDocumentParseStatusSchema,
  }),
});

export const createManualQaResponseDataSchema = z.object({
  question_item: z.object({
    id: z.string().min(1),
  }),
  answer_variant: z.object({
    id: z.string().min(1),
  }),
  source_document: z
    .object({
      id: z.string().min(1),
      parse_status: sourceDocumentParseStatusSchema,
    })
    .optional(),
});

export type CreateManualQaRequest = z.infer<typeof createManualQaRequestSchema>;
export type CreateTextSourceRequest = z.infer<typeof createTextSourceRequestSchema>;
export type ListSourcesQuery = z.infer<typeof listSourcesQuerySchema>;
export type CreateManualQaResponseData = z.infer<
  typeof createManualQaResponseDataSchema
>;
export type CreateTextSourceResponseData = z.infer<
  typeof createTextSourceResponseDataSchema
>;
export type ListSourcesResponseData = z.infer<typeof listSourcesResponseDataSchema>;
