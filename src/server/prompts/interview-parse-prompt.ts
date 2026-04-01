import {
  getRequiredPromptMetadata,
  getRequiredPromptSection,
  loadPromptMarkdown,
  renderPromptTemplate,
} from "@/server/prompts/markdown-prompt-loader";

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

const interviewParsePromptDocument = loadPromptMarkdown("interview-parse.md");
const interviewParsePromptTemplate = getRequiredPromptSection(
  interviewParsePromptDocument,
  "template",
);
const interviewParsePromptRules = getRequiredPromptSection(
  interviewParsePromptDocument,
  "rules",
);
const interviewParsePromptJsonShape = getRequiredPromptSection(
  interviewParsePromptDocument,
  "json_shape",
);

export const interviewParsePromptVersion = getRequiredPromptMetadata(
  interviewParsePromptDocument,
  "version",
);

export const interviewParseInstructions = getRequiredPromptSection(
  interviewParsePromptDocument,
  "instructions",
);

export function buildInterviewParsePrompt(
  input: InterviewParsePromptInput,
  options: InterviewParsePromptOptions = {},
) {
  const categories = input.canonicalVocabulary?.categories ?? [];
  const tags = input.canonicalVocabulary?.tags ?? [];
  const hasChunk = Boolean(options.chunkCount && options.chunkCount > 1);
  const hasVocabulary = categories.length > 0 || tags.length > 0;

  return renderPromptTemplate(interviewParsePromptTemplate, {
    promptVersion: interviewParsePromptVersion,
    kind: input.kind,
    title: input.title,
    sourceText: input.sourceText,
    rules: interviewParsePromptRules,
    jsonShape: interviewParsePromptJsonShape,
    chunk:
      hasChunk && options.chunkCount
        ? {
            chunkIndex: options.chunkIndex ?? 1,
            chunkCount: options.chunkCount,
          }
        : null,
    vocabulary: hasVocabulary,
    categories_line:
      categories.length > 0
        ? {
            categories: categories.join(", "),
          }
        : null,
    tags_line:
      tags.length > 0
        ? {
            tags: tags.join(", "),
          }
        : null,
  });
}
