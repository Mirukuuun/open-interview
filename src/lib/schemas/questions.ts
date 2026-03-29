import { z } from "zod";

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

function coerceOptionalString() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmedValue = value.trim();

      return trimmedValue.length > 0 ? trimmedValue : undefined;
    },
    z.string().min(1).optional(),
  );
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

export const questionDifficultySchema = z.enum(["easy", "medium", "hard"]);

export const questionSortSchema = z.enum(["updated_at", "source_count"]);

export const listQuestionsQuerySchema = z.object({
  q: coerceOptionalString(),
  category: coerceOptionalString(),
  tag: coerceOptionalString(),
  difficulty: coerceOptionalEnum(["easy", "medium", "hard"]),
  sort: coerceOptionalEnum(["updated_at", "source_count"]).default("updated_at"),
  page: coercePositiveInteger(1, 999),
  page_size: coercePositiveInteger(20, 100),
});

export const questionListItemSchema = z.object({
  id: z.string().min(1),
  question_text: z.string().min(1),
  category: z.string().min(1).nullable().optional(),
  difficulty: questionDifficultySchema.nullable().optional(),
  source_count: z.number().int().min(0),
  updated_at: z.string().datetime(),
  tags: z.array(z.string()),
});

export const listQuestionsResponseDataSchema = z.object({
  items: z.array(questionListItemSchema),
  page: z.number().int().min(1),
  page_size: z.number().int().min(1),
  total: z.number().int().min(0),
});

export const questionSourceSchema = z.object({
  source_document_id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum([
    "interview_experience",
    "knowledge_note",
    "resume",
    "manual_input",
  ]),
  source_url: z.string().min(1).nullable().optional(),
  source_snippet: z.string().min(1).nullable().optional(),
  interview_experience: z
    .object({
      id: z.string().min(1),
      company: z.string().min(1).nullable().optional(),
      role: z.string().min(1).nullable().optional(),
      round_info: z.string().min(1).nullable().optional(),
    })
    .optional(),
});

export const questionAnswerVariantSchema = z.object({
  id: z.string().min(1),
  variant_type: z.enum([
    "canonical",
    "personal",
    "concise",
    "deep_dive",
    "follow_up",
  ]),
  content: z.string().min(1),
});

export const relatedQuestionSchema = z.object({
  id: z.string().min(1),
  question_text: z.string().min(1),
  category: z.string().min(1).nullable().optional(),
  source_count: z.number().int().min(0),
  tags: z.array(z.string()),
  shared_source_count: z.number().int().min(0).optional(),
});

export const questionDetailSchema = z.object({
  id: z.string().min(1),
  question_text: z.string().min(1),
  canonical_answer: z.string().min(1).nullable().optional(),
  category: z.string().min(1).nullable().optional(),
  difficulty: questionDifficultySchema.nullable().optional(),
  source_count: z.number().int().min(0),
  review_status: z.enum(["draft", "active", "archived"]),
  updated_at: z.string().datetime(),
  tags: z.array(z.string()),
  sources: z.array(questionSourceSchema),
  answer_variants: z.array(questionAnswerVariantSchema),
  related_questions: z.array(relatedQuestionSchema),
});

export const getQuestionResponseDataSchema = z.object({
  question_item: questionDetailSchema,
});

export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
export type ListQuestionsResponseData = z.infer<
  typeof listQuestionsResponseDataSchema
>;
export type QuestionDetail = z.infer<typeof questionDetailSchema>;
export type QuestionListItem = z.infer<typeof questionListItemSchema>;
