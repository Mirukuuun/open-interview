import { z } from "zod";

export const parseSourceKindGuessSchema = z.enum([
  "interview_experience",
  "knowledge_note",
  "resume",
  "manual_input",
]);

export const parseInterviewExperienceSchema = z.object({
  company: z.string().min(1).nullable().optional(),
  role: z.string().min(1).nullable().optional(),
  round_info: z.string().min(1).nullable().optional(),
  summary: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export const parseQuestionCandidateSchema = z.object({
  question_text: z.string().min(1),
  answer: z.string().min(1).nullable().optional(),
  canonical_answer: z.string().min(1).nullable().optional(),
  source_answer: z.string().min(1).nullable().optional(),
  category: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().min(1)).optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  merge_hint_question_id: z.string().min(1).nullable().optional(),
});

export const parseResumeProjectCandidateSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1).nullable().optional(),
  highlights: z.array(z.string().min(1)).optional(),
  tech_stack: z.array(z.string().min(1)).optional(),
  deep_dive_questions: z.array(z.string().min(1)).optional(),
});

export const parseResultSchema = z.object({
  source_summary: z.string().min(1).optional(),
  source_kind_guess: parseSourceKindGuessSchema.optional(),
  interview_experience: parseInterviewExperienceSchema.nullable().optional(),
  questions: z.array(parseQuestionCandidateSchema),
  resume_projects: z.array(parseResumeProjectCandidateSchema).optional(),
  warnings: z.array(z.string().min(1)).optional(),
});

export type ParseInterviewExperience = z.infer<
  typeof parseInterviewExperienceSchema
>;
export type ParseQuestionCandidate = z.infer<
  typeof parseQuestionCandidateSchema
>;
export type ParseResumeProjectCandidate = z.infer<
  typeof parseResumeProjectCandidateSchema
>;
export type ParseResult = z.infer<typeof parseResultSchema>;
