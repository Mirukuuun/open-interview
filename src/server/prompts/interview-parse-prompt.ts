/**
 * [POS] 维护 interview / knowledge note 解析链路的固定 prompt 模板与 provider instructions。
 * [IN] 已裁剪的 source text、source metadata、chunk metadata 与 canonical vocabulary。
 * [OUT] 返回可直接发给 LLM 的 prompt 字符串与 instructions；不负责 provider 调用或结果校验。
 *
 * @feature open-interview-server-core-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

export type InterviewParsePromptInput = {
  kind: "interview_experience" | "knowledge_note" | "resume" | "manual_input";
  title: string;
  sourceText: string;
  canonicalVocabulary?: {
    categories?: string[];
    tags?: string[];
  };
};

export type InterviewParsePromptOptions = {
  chunkIndex?: number;
  chunkCount?: number;
};

export const interviewParsePromptVersion = "extract_interview_v2";

export const interviewParseInstructions =
  "You are a server-side parser for interview and knowledge-note sources. Return a single JSON object only, with no markdown, no commentary, and no tool calls. All natural-language fields in the JSON must use Simplified Chinese unless the field is source_answer quoting raw source evidence. When source_answer is present, preserve the full raw answer span from the source instead of summarizing or shortening it.";

export function buildInterviewParsePrompt(
  input: InterviewParsePromptInput,
  options: InterviewParsePromptOptions = {},
) {
  const categories = input.canonicalVocabulary?.categories ?? [];
  const tags = input.canonicalVocabulary?.tags ?? [];

  return [
    `Prompt version: ${interviewParsePromptVersion}`,
    `Source kind: ${input.kind}`,
    `Title: ${input.title}`,
    ...(options.chunkCount && options.chunkCount > 1
      ? [
          `Chunk: ${options.chunkIndex ?? 1} of ${options.chunkCount}`,
          "This source text is one chunk from a longer document. Extract only what is supported by this chunk.",
        ]
      : []),
    "Task: Extract interview-review candidates from the source text.",
    "Return JSON only. Do not wrap in markdown.",
    "Rules:",
    "- Extract questions only when they are actually present or strongly implied by the source.",
    "- Keep question_text concise and interviewer-facing.",
    "- Use Simplified Chinese for all natural-language JSON fields such as source_summary, question_text, canonical_answer, warnings, and interview metadata narratives.",
    "- Preserve enum values, canonical category/tag identifiers, and fixed technical identifiers as-is.",
    "- Use source_answer for raw candidate answers from the source when available.",
    "- source_answer must preserve the full answer span from the source for that question instead of a shortened summary.",
    "- When the answer is a numbered list, multi-line explanation, or layered breakdown, include every supported line in source_answer.",
    "- Do not summarize, shorten, or normalize source_answer; keep it as close to the source wording as possible.",
    "- Treat source_answer as the authoritative raw evidence field.",
    "- If output budget is tight, return fewer questions instead of shortening source_answer.",
    "- If you cannot preserve a complete source_answer for a candidate, omit that candidate rather than emitting an abbreviated source_answer.",
    "- Keep source_answer in the source language when it is a raw excerpt from the document; do not translate direct source evidence.",
    "- Use canonical_answer only when the source clearly supports a normalized answer.",
    "- canonical_answer should be written in concise Simplified Chinese even when source_answer quotes the raw source verbatim.",
    "- Reuse the provided canonical categories and tags exactly when they fit the evidence.",
    "- If no provided category fits a question, return null for category instead of inventing a near-match.",
    "- Tags should be a subset of the provided canonical tags when those tags fit the source.",
    "- Keep confidence between 0 and 1.",
    "- interview_experience should be null when company / role / round / summary metadata is not present.",
    "- warnings should explain missing structure, truncation, ambiguity, or weak evidence.",
    "- Never invent canonical database IDs.",
    ...(categories.length > 0 || tags.length > 0
      ? [
          "",
          "Canonical vocabulary to reuse exactly when relevant:",
          `- Categories: ${categories.length > 0 ? categories.join(", ") : "(none provided)"}`,
          `- Tags: ${tags.length > 0 ? tags.join(", ") : "(none provided)"}`,
        ]
      : []),
    "",
    "Return exactly this JSON shape:",
    `{"source_summary":"string","source_kind_guess":"interview_experience|knowledge_note","interview_experience":{"company":null,"role":null,"round_info":null,"summary":null,"tags":[]} | null,"questions":[{"question_text":"string","canonical_answer":null,"source_answer":null,"category":null,"tags":[],"confidence":0.0}],"warnings":[]}`,
    "",
    "Source text:",
    input.sourceText,
  ].join("\n");
}
