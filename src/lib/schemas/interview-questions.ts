import { z } from "zod";

export const interviewQuestionPromoteRequestSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("create"),
    }),
    z.object({
      action: z.literal("merge"),
      target_question_id: z.string().trim().min(1),
    }),
  ],
);

export const interviewQuestionPromoteResponseDataSchema = z.object({
  promotion: z.object({
    interview_question_id: z.string().min(1),
    question_item_id: z.string().min(1),
    question_text: z.string().min(1),
    link_type: z.enum(["promoted_create", "promoted_merge"]),
  }),
});

export type InterviewQuestionPromoteRequest = z.infer<
  typeof interviewQuestionPromoteRequestSchema
>;
export type InterviewQuestionPromoteResponseData = z.infer<
  typeof interviewQuestionPromoteResponseDataSchema
>;
