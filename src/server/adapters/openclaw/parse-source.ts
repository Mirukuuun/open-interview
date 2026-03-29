import {
  parseResultSchema,
  type ParseInterviewExperience,
  type ParseQuestionCandidate,
  type ParseResult,
} from "@/lib/schemas/parse-result";
import {
  normalizeCategoryName,
  normalizeQuestionText,
  normalizeTagName,
} from "@/server/repositories/normalization";
import { z } from "zod";

import { openClawLlmClient } from "./llm-client";

type CanonicalInterviewVocabulary = {
  categories?: string[];
  tags?: string[];
};

type ParseSourceInput = {
  kind: "interview_experience" | "knowledge_note" | "resume" | "manual_input";
  title: string;
  rawText: string;
  jobType: "extract_interview" | "extract_resume" | "normalize_manual_input";
  canonicalVocabulary?: CanonicalInterviewVocabulary;
};

type LlmInterviewQuestion = {
  question_text: string;
  canonical_answer?: string | null;
  source_answer?: string | null;
  category?: string | null;
  tags?: string[] | null;
  confidence?: number | null;
};

type CandidateBuffer = {
  questionText: string;
  answerLines: string[];
  confidence: number;
};

type InterviewPromptOptions = {
  chunkIndex?: number;
  chunkCount?: number;
};

type InterviewChunk = {
  rawText: string;
  chunkIndex: number;
  chunkCount: number;
};

const questionLabelRegex =
  /^(?:q(?:uestion)?|question|问(?:题)?|题目|面试题|问题)\s*[:：]\s*(.+)$/iu;
const answerLabelRegex =
  /^(?:a(?:nswer)?|answer|答(?:案)?|回答|思路|解析)\s*[:：]\s*(.+)$/iu;
const bulletPrefixRegex = /^(?:[-*•]|\d+[.)、-])\s*/u;
const markdownHeadingPrefixRegex = /^#{1,6}\s+/u;
const markdownQuotePrefixRegex = /^>\s*/u;
const metadataPrefixRegex =
  /^(?:公司|company|岗位|role|职位|轮次|round|总结|summary|标签|tags?)\s*[:：]/iu;
const resumeSectionHeadingRegex =
  /^(?:projects?|selected projects?|project experience|project history|professional experience|work experience|employment|项目经历|项目经验|工作经历|实习经历|开源项目)\s*[:：]?$/iu;
const resumeStopSectionHeadingRegex =
  /^(?:education|skills?|certifications?|awards?|summary|profile|contact|教育经历|技能|证书|获奖|联系方式)\s*[:：]?$/iu;
const resumeProjectTitleLabelRegex = /^(?:project|项目)\s*[:：]\s*(.+)$/iu;
const resumeTechStackLabelRegex =
  /^(?:tech(?:\s+stack)?|stack|技术栈|技术|tools?)\s*[:：]\s*(.+)$/iu;
const resumeSummaryLabelRegex =
  /^(?:summary|overview|描述|介绍|项目描述|职责|role)\s*[:：]\s*(.+)$/iu;
const resumeActionLineRegex =
  /^(?:built|led|designed|developed|implemented|created|launched|owned|improved|optimized|reduced|scaled|migrated|automated|delivered|drove|shipped|maintained|负责|设计|开发|实现|构建|搭建|优化|主导|落地|维护|推动|完成)/iu;
const dateRangeProjectRegex =
  /^(?:(?:20)?\d{2}[./-]\d{1,2}(?:\s*(?:-|–|—|to|至|~)\s*(?:(?:20)?\d{2}[./-]\d{1,2}|present|current|至今))?)\s*[|｜-]\s*(.+)$/iu;
const contactLineRegex = /(?:@|linkedin|github|电话|手机|email|邮箱|微信)/iu;
const projectBulletRegex = /^(?:[-*•]|\d+[.)、-])\s*(.+)$/u;

const categoryKeywordMap: Array<{
  category: string;
  keywords: string[];
}> = [
  {
    category: "distributed_system",
    keywords: ["redis", "mq", "kafka", "rabbitmq", "rocketmq", "zk", "zookeeper", "etcd", "分布式", "一致性", "缓存"],
  },
  {
    category: "database",
    keywords: ["mysql", "sql", "索引", "事务", "binlog", "mvcc", "数据库"],
  },
  {
    category: "java_concurrency",
    keywords: ["threadlocal", "volatile", "aqs", "synchronized", "并发", "线程池", "锁", "juc"],
  },
  {
    category: "java_jvm",
    keywords: ["jvm", "gc", "classloader", "类加载", "垃圾回收", "字节码"],
  },
  {
    category: "backend_framework",
    keywords: ["spring", "springboot", "mybatis", "ioc", "aop"],
  },
  {
    category: "networking",
    keywords: ["http", "https", "tcp", "rpc", "网络", "协议"],
  },
  {
    category: "system_design",
    keywords: ["设计", "高可用", "限流", "降级", "幂等", "架构"],
  },
];

const tagKeywordMap: Array<{
  tag: string;
  keywords: string[];
}> = [
  { tag: "redis", keywords: ["redis"] },
  { tag: "mq", keywords: ["mq", "kafka", "rocketmq", "rabbitmq", "消息队列"] },
  { tag: "mysql", keywords: ["mysql", "sql", "数据库"] },
  { tag: "threadlocal", keywords: ["threadlocal"] },
  { tag: "concurrency", keywords: ["并发", "线程", "线程池", "volatile", "synchronized"] },
  { tag: "jvm", keywords: ["jvm", "gc", "类加载"] },
  { tag: "spring", keywords: ["spring", "springboot", "mybatis"] },
  { tag: "network", keywords: ["http", "https", "tcp", "rpc", "网络"] },
  { tag: "design", keywords: ["设计", "高可用", "架构", "限流"] },
];

const techKeywordMap: Array<{
  tech: string;
  keywords: string[];
}> = [
  { tech: "Java", keywords: ["java", "spring", "springboot"] },
  { tech: "TypeScript", keywords: ["typescript", "ts"] },
  { tech: "React", keywords: ["react", "next.js", "nextjs"] },
  { tech: "Node.js", keywords: ["node", "nodejs", "node.js"] },
  { tech: "Redis", keywords: ["redis"] },
  { tech: "Kafka", keywords: ["kafka"] },
  { tech: "RabbitMQ", keywords: ["rabbitmq"] },
  { tech: "RocketMQ", keywords: ["rocketmq"] },
  { tech: "MySQL", keywords: ["mysql"] },
  { tech: "PostgreSQL", keywords: ["postgresql", "postgres"] },
  { tech: "SQLite", keywords: ["sqlite"] },
  { tech: "ClickHouse", keywords: ["clickhouse"] },
  { tech: "Flink", keywords: ["flink"] },
  { tech: "Spark", keywords: ["spark"] },
  { tech: "Docker", keywords: ["docker"] },
  { tech: "Kubernetes", keywords: ["kubernetes", "k8s"] },
  { tech: "AWS", keywords: ["aws"] },
  { tech: "OpenAI", keywords: ["openai"] },
];

const interviewParsePromptVersion = "extract_interview_v2";
const interviewPromptMaxChars = 24_000;
const interviewChunkingThresholdChars = interviewPromptMaxChars;
const interviewChunkTargetChars = 18_000;
const interviewChunkMaxCount = 8;

const llmInterviewExperienceSchema = z
  .object({
    company: z.string().nullish(),
    role: z.string().nullish(),
    round_info: z.string().nullish(),
    summary: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
  })
  .nullish();

const llmInterviewResultSchema = z.object({
  source_summary: z.string().nullish(),
  source_kind_guess: z.string().nullish(),
  interview_experience: llmInterviewExperienceSchema,
  questions: z.array(
    z.object({
      question_text: z.string(),
      canonical_answer: z.string().nullish(),
      source_answer: z.string().nullish(),
      category: z.string().nullish(),
      tags: z.array(z.string()).nullish(),
      confidence: z.number().nullish(),
    }),
  ),
  warnings: z.array(z.string()).nullish(),
});

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function splitLines(rawText: string) {
  return rawText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stripBulletPrefix(value: string) {
  return value.replace(bulletPrefixRegex, "").trim();
}

function stripMarkdownStructurePrefix(value: string) {
  return value
    .replace(markdownHeadingPrefixRegex, "")
    .replace(markdownQuotePrefixRegex, "")
    .trim();
}

function splitCommaLikeValues(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，/|、]/u)
        .map((part) => collapseWhitespace(part))
        .filter((part) => part.length > 0),
    ),
  );
}

function cleanQuestionText(value: string) {
  return collapseWhitespace(
    stripMarkdownStructurePrefix(stripBulletPrefix(value))
      .replace(questionLabelRegex, "$1")
      .replace(/[：:]\s*$/u, ""),
  );
}

function cleanAnswerText(value: string) {
  return collapseWhitespace(
    stripMarkdownStructurePrefix(value).replace(answerLabelRegex, "$1"),
  );
}

function isQuestionLike(value: string) {
  const text = collapseWhitespace(
    stripMarkdownStructurePrefix(stripBulletPrefix(value)),
  );

  if (text.length < 4 || metadataPrefixRegex.test(text)) {
    return false;
  }

  if (/[?？]$/u.test(text)) {
    return true;
  }

  return /(什么|怎么|如何|为什么|哪些|区别|原理|场景|问题|实现|设计|优缺点|流程|机制)/u.test(
    text,
  );
}

function questionConfidence(value: string, labeled: boolean) {
  if (labeled) {
    return 0.92;
  }

  if (/[?？]$/u.test(value)) {
    return 0.82;
  }

  return 0.68;
}

function extractLabelValue(lines: string[], labels: string[]) {
  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    for (const label of labels) {
      const lowerLabel = label.toLowerCase();

      if (
        lowerLine.startsWith(`${lowerLabel}:`) ||
        lowerLine.startsWith(`${lowerLabel}：`)
      ) {
        const value = collapseWhitespace(line.slice(label.length + 1));

        return value.length > 0 ? value : null;
      }
    }
  }

  return null;
}

function splitTagValues(value: string | null) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/[,，/|]/u)
        .map((part) => collapseWhitespace(part))
        .filter((part) => part.length > 0),
    ),
  );
}

function inferCategory(text: string) {
  const lowerText = text.toLowerCase();

  return (
    categoryKeywordMap.find(({ keywords }) =>
      keywords.some((keyword) => lowerText.includes(keyword.toLowerCase())),
    )?.category ?? null
  );
}

function inferTags(text: string) {
  const lowerText = text.toLowerCase();

  return Array.from(
    new Set(
      tagKeywordMap
        .filter(({ keywords }) =>
          keywords.some((keyword) => lowerText.includes(keyword.toLowerCase())),
        )
        .map(({ tag }) => tag),
    ),
  );
}

function inferTechStack(text: string) {
  const lowerText = text.toLowerCase();

  return Array.from(
    new Set(
      techKeywordMap
        .filter(({ keywords }) =>
          keywords.some((keyword) => lowerText.includes(keyword.toLowerCase())),
        )
        .map(({ tech }) => tech),
    ),
  );
}

function buildSourceSummary(title: string, lines: string[], summary: string | null) {
  if (summary) {
    return truncateText(summary, 160);
  }

  const summaryLines = lines
    .filter((line) => !metadataPrefixRegex.test(line))
    .slice(0, 2);

  if (summaryLines.length === 0) {
    return truncateText(title, 160);
  }

  return truncateText(summaryLines.join(" / "), 160);
}

function trimNullableString(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = collapseWhitespace(value);

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeStringList(
  values: Array<string | null | undefined> | null | undefined,
  maxItems = 8,
) {
  if (!values) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => trimNullableString(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, maxItems);
}

function clampConfidence(value: number | null | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeCanonicalVocabulary(
  input: ParseSourceInput["canonicalVocabulary"],
) {
  return {
    categories: Array.from(
      new Map(
        normalizeStringList(input?.categories ?? [], 24).map((category) => [
          normalizeCategoryName(category),
          category,
        ]),
      ).values(),
    ),
    tags: Array.from(
      new Map(
        normalizeStringList(input?.tags ?? [], 60).map((tag) => [
          normalizeTagName(tag),
          tag,
        ]),
      ).values(),
    ),
  };
}

function findCanonicalCategoryMatch(
  value: string | null | undefined,
  canonicalCategories: string[],
) {
  const normalizedValue = trimNullableString(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    canonicalCategories.find(
      (category) =>
        normalizeCategoryName(category) === normalizeCategoryName(normalizedValue),
    ) ?? null
  );
}

function findCanonicalTagMatch(value: string | null | undefined, canonicalTags: string[]) {
  const normalizedValue = trimNullableString(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    canonicalTags.find(
      (tag) => normalizeTagName(tag) === normalizeTagName(normalizedValue),
    ) ?? null
  );
}

function resolveQuestionCategory(
  rawCategory: string | null | undefined,
  combinedText: string,
  canonicalCategories: string[],
) {
  const normalizedRawCategory = trimNullableString(rawCategory);
  const canonicalCategory =
    findCanonicalCategoryMatch(normalizedRawCategory, canonicalCategories) ??
    findCanonicalCategoryMatch(inferCategory(combinedText), canonicalCategories);

  return canonicalCategory ?? normalizedRawCategory ?? inferCategory(combinedText);
}

function resolveQuestionTags(
  rawTags: Array<string | null | undefined> | null | undefined,
  combinedText: string,
  canonicalTags: string[],
) {
  const combinedCandidates = normalizeStringList([
    ...(rawTags ?? []),
    ...inferTags(combinedText),
  ]);

  if (canonicalTags.length === 0) {
    return combinedCandidates;
  }

  const canonicalMatches = Array.from(
    new Set(
      combinedCandidates
        .map((tag) => findCanonicalTagMatch(tag, canonicalTags))
        .filter((tag): tag is string => Boolean(tag)),
    ),
  );

  return canonicalMatches.length > 0 ? canonicalMatches : combinedCandidates;
}

function normalizeMultilineText(value: string) {
  return value.replace(/\r\n?/gu, "\n").trim();
}

function splitOversizedText(value: string, maxLength: number) {
  const segments: string[] = [];
  let remaining = normalizeMultilineText(value);

  while (remaining.length > maxLength) {
    const searchWindow = remaining.slice(0, maxLength + 1);
    const preferredBreakIndex = Math.max(
      searchWindow.lastIndexOf("\n"),
      searchWindow.lastIndexOf(" "),
      searchWindow.lastIndexOf("。"),
      searchWindow.lastIndexOf("！"),
      searchWindow.lastIndexOf("？"),
      searchWindow.lastIndexOf("."),
      searchWindow.lastIndexOf("!"),
      searchWindow.lastIndexOf("?"),
      searchWindow.lastIndexOf(";"),
      searchWindow.lastIndexOf("；"),
    );
    const splitIndex =
      preferredBreakIndex >= Math.floor(maxLength * 0.6)
        ? preferredBreakIndex + 1
        : maxLength;
    const segment = remaining.slice(0, splitIndex).trim();

    segments.push(segment.length > 0 ? segment : remaining.slice(0, maxLength).trim());
    remaining = remaining.slice(Math.max(splitIndex, 1)).trim();
  }

  if (remaining.length > 0) {
    segments.push(remaining);
  }

  return segments;
}

function splitLongParagraph(paragraph: string) {
  const normalizedParagraph = normalizeMultilineText(paragraph);

  if (normalizedParagraph.length <= interviewChunkTargetChars) {
    return [normalizedParagraph];
  }

  const lines = normalizedParagraph
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return splitOversizedText(normalizedParagraph, interviewChunkTargetChars);
  }

  const segments: string[] = [];
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.length > interviewChunkTargetChars) {
      if (currentLines.length > 0) {
        segments.push(currentLines.join("\n"));
        currentLines = [];
      }

      segments.push(...splitOversizedText(line, interviewChunkTargetChars));
      continue;
    }

    const nextSegment =
      currentLines.length === 0 ? line : `${currentLines.join("\n")}\n${line}`;

    if (nextSegment.length > interviewChunkTargetChars) {
      segments.push(currentLines.join("\n"));
      currentLines = [line];
      continue;
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    segments.push(currentLines.join("\n"));
  }

  return segments;
}

function buildInterviewChunks(rawText: string): InterviewChunk[] {
  const normalizedRawText = normalizeMultilineText(rawText);
  const paragraphs = normalizedRawText
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  const units = (paragraphs.length > 0 ? paragraphs : [normalizedRawText]).flatMap(
    splitLongParagraph,
  );
  const chunkTexts: string[] = [];
  let currentUnits: string[] = [];
  let currentLength = 0;

  for (const unit of units) {
    const separatorLength = currentUnits.length > 0 ? 2 : 0;
    const nextLength = currentLength + separatorLength + unit.length;

    if (nextLength > interviewChunkTargetChars && currentUnits.length > 0) {
      chunkTexts.push(currentUnits.join("\n\n"));
      currentUnits = [unit];
      currentLength = unit.length;
      continue;
    }

    currentUnits.push(unit);
    currentLength = nextLength;
  }

  if (currentUnits.length > 0) {
    chunkTexts.push(currentUnits.join("\n\n"));
  }

  if (chunkTexts.length > interviewChunkMaxCount) {
    throw new Error(
      `chunk_limit_exceeded: Source text exceeded the bounded ${interviewChunkMaxCount}-chunk limit for interview parsing.`,
    );
  }

  return chunkTexts.map((chunkRawText, index, chunks) => ({
    rawText: chunkRawText,
    chunkIndex: index + 1,
    chunkCount: chunks.length,
  }));
}

function buildInterviewPrompt(
  input: ParseSourceInput,
  options: InterviewPromptOptions = {},
) {
  const canonicalVocabulary = normalizeCanonicalVocabulary(input.canonicalVocabulary);
  const truncatedRawText =
    input.rawText.length > interviewPromptMaxChars
      ? `${input.rawText.slice(0, interviewPromptMaxChars).trimEnd()}\n\n[TRUNCATED AFTER ${interviewPromptMaxChars} CHARACTERS FOR THIS SLICE]`
      : input.rawText;

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
    ...(canonicalVocabulary.categories.length > 0 || canonicalVocabulary.tags.length > 0
      ? [
          "",
          "Canonical vocabulary to reuse exactly when relevant:",
          `- Categories: ${canonicalVocabulary.categories.length > 0 ? canonicalVocabulary.categories.join(", ") : "(none provided)"}`,
          `- Tags: ${canonicalVocabulary.tags.length > 0 ? canonicalVocabulary.tags.join(", ") : "(none provided)"}`,
        ]
      : []),
    "",
    "Return exactly this JSON shape:",
    `{"source_summary":"string","source_kind_guess":"interview_experience|knowledge_note","interview_experience":{"company":null,"role":null,"round_info":null,"summary":null,"tags":[]} | null,"questions":[{"question_text":"string","canonical_answer":null,"source_answer":null,"category":null,"tags":[],"confidence":0.0}],"warnings":[]}`,
    "",
    "Source text:",
    truncatedRawText,
  ].join("\n");
}

function hasInterviewExperienceData(value: ParseInterviewExperience | null) {
  if (!value) {
    return false;
  }

  return Boolean(
    value.company ||
      value.role ||
      value.round_info ||
      value.summary ||
      (value.tags?.length ?? 0) > 0,
  );
}

function mergeQuestionCandidate(
  dedupeMap: Map<string, ParseQuestionCandidate>,
  candidate: ParseQuestionCandidate,
) {
  const normalizedQuestionText = normalizeQuestionText(candidate.question_text);
  const existing = dedupeMap.get(normalizedQuestionText);

  if (!existing) {
    dedupeMap.set(normalizedQuestionText, candidate);
    return;
  }

  if (!existing.source_answer && candidate.source_answer) {
    existing.source_answer = candidate.source_answer;
  }

  if (!existing.canonical_answer && candidate.canonical_answer) {
    existing.canonical_answer = candidate.canonical_answer;
  }

  if (!existing.category && candidate.category) {
    existing.category = candidate.category;
  }

  existing.tags = Array.from(
    new Set([...(existing.tags ?? []), ...(candidate.tags ?? [])]),
  );
  existing.confidence = Math.max(existing.confidence ?? 0, candidate.confidence ?? 0);
}

function normalizeLlmQuestionCandidates(
  rawQuestions: LlmInterviewQuestion[],
  canonicalVocabulary: ParseSourceInput["canonicalVocabulary"],
) {
  const normalizedVocabulary = normalizeCanonicalVocabulary(canonicalVocabulary);
  const dedupeMap = new Map<string, ParseQuestionCandidate>();

  for (const rawQuestion of rawQuestions) {
    const questionText = cleanQuestionText(rawQuestion.question_text);

    if (questionText.length < 4) {
      continue;
    }

    const sourceAnswer = trimNullableString(rawQuestion.source_answer);
    const canonicalAnswer = trimNullableString(rawQuestion.canonical_answer) ?? sourceAnswer;
    const category = trimNullableString(rawQuestion.category);
    const combinedText = collapseWhitespace(
      [questionText, sourceAnswer, canonicalAnswer, category]
        .filter((value): value is string => Boolean(value))
        .join(" "),
    );
    const tags = resolveQuestionTags(
      rawQuestion.tags,
      combinedText,
      normalizedVocabulary.tags,
    );

    mergeQuestionCandidate(dedupeMap, {
      question_text: questionText,
      canonical_answer: canonicalAnswer ?? null,
      source_answer: sourceAnswer ?? null,
      category: resolveQuestionCategory(
        category,
        combinedText,
        normalizedVocabulary.categories,
      ),
      tags,
      confidence: clampConfidence(rawQuestion.confidence, sourceAnswer ? 0.78 : 0.68),
      merge_hint_question_id: null,
    });
  }

  return Array.from(dedupeMap.values());
}

function buildInterviewExperienceFromLlm(
  input: ParseSourceInput,
  lines: string[],
  rawInterviewExperience: z.infer<typeof llmInterviewExperienceSchema>,
) {
  if (!rawInterviewExperience) {
    return null;
  }

  const canonicalVocabulary = normalizeCanonicalVocabulary(input.canonicalVocabulary);
  const tags = normalizeStringList([
    ...resolveQuestionTags(
      rawInterviewExperience.tags,
      `${input.title} ${rawInterviewExperience.summary ?? ""} ${lines.slice(0, 12).join(" ")}`,
      canonicalVocabulary.tags,
    ),
  ]);
  const interviewExperience: ParseInterviewExperience = {
    company: trimNullableString(rawInterviewExperience.company),
    role: trimNullableString(rawInterviewExperience.role),
    round_info: trimNullableString(rawInterviewExperience.round_info),
    summary: trimNullableString(rawInterviewExperience.summary),
    tags,
  };

  return hasInterviewExperienceData(interviewExperience) ? interviewExperience : null;
}

function buildHeuristicInterviewResult(input: ParseSourceInput, lines: string[]): ParseResult {
  const interviewExperience = extractInterviewExperience(
    input,
    lines,
  );
  const summary = buildSourceSummary(input.title, lines, interviewExperience?.summary ?? null);
  const questions = extractQuestionCandidates(lines, input.canonicalVocabulary);

  return parseResultSchema.parse({
    source_summary: summary,
    source_kind_guess: input.kind,
    interview_experience: interviewExperience,
    questions,
    warnings:
      questions.length === 0
        ? ["没有稳定识别出题目候选，请结合原文手动检查后决定是否重试。"]
        : [],
  });
}

function withPrependedWarning(result: ParseResult, warning: string): ParseResult {
  return parseResultSchema.parse({
    ...result,
    warnings: normalizeStringList([warning, ...(result.warnings ?? [])], 12),
  });
}

function isHeuristicInterviewFallbackEnabled() {
  return process.env.OPEN_INTERVIEW_ALLOW_HEURISTIC_INTERVIEW_PARSE_FALLBACK !== "0";
}

async function buildInterviewResultFromLlm(
  input: ParseSourceInput,
  lines: string[],
  options: InterviewPromptOptions = {},
): Promise<ParseResult> {
  const rawModelResult = await openClawLlmClient.createJsonObject({
    instructions:
      "You are a server-side parser for interview and knowledge-note sources. Return a single JSON object only, with no markdown, no commentary, and no tool calls. All natural-language fields in the JSON must use Simplified Chinese unless the field is source_answer quoting raw source evidence.",
    input: buildInterviewPrompt(input, options),
    maxOutputTokens: 2_000,
  });

  let parsedModelResult: z.infer<typeof llmInterviewResultSchema>;

  try {
    parsedModelResult = llmInterviewResultSchema.parse(rawModelResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const issuePath = firstIssue?.path.join(".") || "root";
      throw new Error(
        `schema_validation_failed: Model JSON did not match the interview parse contract at ${issuePath}.`,
      );
    }

    throw error;
  }

  const interviewExperience = buildInterviewExperienceFromLlm(
    input,
    lines,
    parsedModelResult.interview_experience,
  );
  const questions = normalizeLlmQuestionCandidates(
    parsedModelResult.questions,
    input.canonicalVocabulary,
  );
  const warnings = normalizeStringList([
    ...(parsedModelResult.warnings ?? []),
    ...(input.rawText.length > interviewPromptMaxChars
      ? [
          `Only the first ${interviewPromptMaxChars} characters were sent to the model in this slice; review the full source before confirming.`,
        ]
      : []),
    ...(questions.length === 0
      ? ["The model returned no stable question candidates. Review the raw source before retrying."]
      : []),
  ], 12);

  try {
    return parseResultSchema.parse({
      source_summary:
        trimNullableString(parsedModelResult.source_summary) ??
        buildSourceSummary(input.title, lines, interviewExperience?.summary ?? null),
      source_kind_guess:
        input.kind === "knowledge_note" ? "knowledge_note" : "interview_experience",
      interview_experience: interviewExperience,
      questions,
      warnings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const issuePath = firstIssue?.path.join(".") || "root";
      throw new Error(
        `schema_validation_failed: Normalized interview parse result was invalid at ${issuePath}.`,
      );
    }

    throw error;
  }
}

function normalizeComparableMetadataValue(value: string | null | undefined) {
  return value ? collapseWhitespace(value).toLowerCase() : null;
}

function mergeMetadataField(
  label: string,
  currentValue: string | null | undefined,
  nextValue: string | null | undefined,
  warnings: string[],
) {
  if (!currentValue) {
    return nextValue ?? null;
  }

  if (!nextValue) {
    return currentValue;
  }

  if (
    normalizeComparableMetadataValue(currentValue) !==
    normalizeComparableMetadataValue(nextValue)
  ) {
    warnings.push(
      `Chunks suggested different ${label} values; kept the earliest non-empty value.`,
    );
  }

  return currentValue;
}

function mergeInterviewExperienceCandidates(
  currentValue: ParseInterviewExperience | null,
  nextValue: ParseInterviewExperience | null,
  warnings: string[],
) {
  if (!currentValue) {
    if (!nextValue) {
      return null;
    }

    return {
      ...nextValue,
      tags: normalizeStringList(nextValue.tags ?? []),
    } satisfies ParseInterviewExperience;
  }

  if (!nextValue) {
    return currentValue;
  }

  const currentSummary = trimNullableString(currentValue.summary);
  const nextSummary = trimNullableString(nextValue.summary);
  const mergedInterviewExperience: ParseInterviewExperience = {
    company: mergeMetadataField("company", currentValue.company, nextValue.company, warnings),
    role: mergeMetadataField("role", currentValue.role, nextValue.role, warnings),
    round_info: mergeMetadataField(
      "round info",
      currentValue.round_info,
      nextValue.round_info,
      warnings,
    ),
    summary:
      !currentSummary || (nextSummary && nextSummary.length > currentSummary.length)
        ? nextSummary
        : currentSummary,
    tags: normalizeStringList([...(currentValue.tags ?? []), ...(nextValue.tags ?? [])]),
  };

  return hasInterviewExperienceData(mergedInterviewExperience)
    ? mergedInterviewExperience
    : null;
}

async function buildChunkedInterviewResultFromLlm(
  input: ParseSourceInput,
  lines: string[],
) {
  const chunks = buildInterviewChunks(input.rawText);
  const chunkWarnings = [
    `Long source was parsed in ${chunks.length} chunks because raw_text exceeded ${interviewChunkingThresholdChars} characters.`,
  ];
  const dedupeMap = new Map<string, ParseQuestionCandidate>();
  let interviewExperience: ParseInterviewExperience | null = null;

  for (const chunk of chunks) {
    const chunkResult = await buildInterviewResultFromLlm(
      {
        ...input,
        rawText: chunk.rawText,
      },
      splitLines(chunk.rawText),
      {
        chunkIndex: chunk.chunkIndex,
        chunkCount: chunk.chunkCount,
      },
    );

    interviewExperience = mergeInterviewExperienceCandidates(
      interviewExperience,
      chunkResult.interview_experience ?? null,
      chunkWarnings,
    );

    for (const question of chunkResult.questions) {
      mergeQuestionCandidate(dedupeMap, question);
    }

    chunkWarnings.push(
      ...(chunkResult.warnings ?? []).map(
        (warning) =>
          `Chunk ${chunk.chunkIndex}/${chunk.chunkCount}: ${truncateText(warning, 180)}`,
      ),
    );
  }

  const questions = Array.from(dedupeMap.values());

  return parseResultSchema.parse({
    source_summary: buildSourceSummary(input.title, lines, interviewExperience?.summary ?? null),
    source_kind_guess:
      input.kind === "knowledge_note" ? "knowledge_note" : "interview_experience",
    interview_experience: interviewExperience,
    questions,
    warnings: normalizeStringList(
      [
        ...chunkWarnings,
        ...(questions.length === 0
          ? [
              "No stable question candidates survived chunk merge. Review the raw source before retrying.",
            ]
          : []),
      ],
      12,
    ),
  });
}

function finalizeCandidate(
  buffer: CandidateBuffer | undefined,
  dedupeMap: Map<string, ParseQuestionCandidate>,
  canonicalVocabulary?: ParseSourceInput["canonicalVocabulary"],
) {
  if (!buffer) {
    return;
  }

  const questionText = cleanQuestionText(buffer.questionText);

  if (!questionText || !isQuestionLike(questionText)) {
    return;
  }

  const normalizedQuestionText = normalizeQuestionText(questionText);
  const sourceAnswer = collapseWhitespace(buffer.answerLines.join("\n"));
  const combinedText = collapseWhitespace(`${questionText} ${sourceAnswer}`);
  const normalizedVocabulary = normalizeCanonicalVocabulary(canonicalVocabulary);
  const existing = dedupeMap.get(normalizedQuestionText);
  const candidate: ParseQuestionCandidate = {
    question_text: questionText,
    canonical_answer: sourceAnswer || null,
    source_answer: sourceAnswer || null,
    category: resolveQuestionCategory(
      null,
      combinedText,
      normalizedVocabulary.categories,
    ),
    tags: resolveQuestionTags([], combinedText, normalizedVocabulary.tags),
    confidence:
      sourceAnswer.length > 0
        ? Math.min(buffer.confidence + 0.05, 0.97)
        : buffer.confidence,
    merge_hint_question_id: null,
  };

  if (!existing) {
    dedupeMap.set(normalizedQuestionText, candidate);
    return;
  }

  if (!existing.source_answer && candidate.source_answer) {
    existing.source_answer = candidate.source_answer;
  }

  if (!existing.canonical_answer && candidate.canonical_answer) {
    existing.canonical_answer = candidate.canonical_answer;
  }

  if (!existing.category && candidate.category) {
    existing.category = candidate.category;
  }

  existing.tags = Array.from(
    new Set([...(existing.tags ?? []), ...(candidate.tags ?? [])]),
  );
  existing.confidence = Math.max(existing.confidence ?? 0, candidate.confidence ?? 0);
}

function extractQuestionCandidates(
  lines: string[],
  canonicalVocabulary?: ParseSourceInput["canonicalVocabulary"],
) {
  const dedupeMap = new Map<string, ParseQuestionCandidate>();
  let currentCandidate: CandidateBuffer | undefined;

  for (const line of lines) {
    const labeledQuestionMatch = line.match(questionLabelRegex);

    if (labeledQuestionMatch) {
      finalizeCandidate(currentCandidate, dedupeMap, canonicalVocabulary);
      currentCandidate = {
        questionText: labeledQuestionMatch[1],
        answerLines: [],
        confidence: questionConfidence(labeledQuestionMatch[1], true),
      };
      continue;
    }

    const strippedLine = stripBulletPrefix(line);

    if (isQuestionLike(strippedLine)) {
      finalizeCandidate(currentCandidate, dedupeMap, canonicalVocabulary);
      currentCandidate = {
        questionText: strippedLine,
        answerLines: [],
        confidence: questionConfidence(strippedLine, false),
      };
      continue;
    }

    const labeledAnswerMatch = line.match(answerLabelRegex);

    if (labeledAnswerMatch && currentCandidate) {
      currentCandidate.answerLines.push(cleanAnswerText(labeledAnswerMatch[1]));
      continue;
    }

    if (currentCandidate) {
      currentCandidate.answerLines.push(cleanAnswerText(line));
    }
  }

  finalizeCandidate(currentCandidate, dedupeMap, canonicalVocabulary);

  return Array.from(dedupeMap.values());
}

function extractInterviewExperience(
  input: Pick<ParseSourceInput, "kind" | "title" | "canonicalVocabulary">,
  lines: string[],
) {
  if (input.kind === "resume" || input.kind === "manual_input") {
    return null;
  }

  const company = extractLabelValue(lines, ["公司", "company"]);
  const role = extractLabelValue(lines, ["岗位", "role", "职位"]);
  const roundInfo = extractLabelValue(lines, ["轮次", "round"]);
  const summary = extractLabelValue(lines, ["总结", "summary"]);
  const metadataTags = splitTagValues(extractLabelValue(lines, ["标签", "tags", "tag"]));
  const canonicalVocabulary = normalizeCanonicalVocabulary(input.canonicalVocabulary);
  const tags = resolveQuestionTags(
    metadataTags,
    `${input.title} ${lines.slice(0, 12).join(" ")}`,
    canonicalVocabulary.tags,
  );

  const interviewExperience: ParseInterviewExperience = {
    company,
    role,
    round_info: roundInfo,
    summary,
    tags,
  };

  if (
    !interviewExperience.company &&
    !interviewExperience.role &&
    !interviewExperience.round_info &&
    !interviewExperience.summary &&
    (!interviewExperience.tags || interviewExperience.tags.length === 0)
  ) {
    return null;
  }

  return interviewExperience;
}

function looksLikeResumeProjectTitle(value: string) {
  const compactValue = collapseWhitespace(stripBulletPrefix(value));
  const latinTokenCount = compactValue.split(/\s+/u).length;

  if (
    compactValue.length < 4 ||
    compactValue.length > 96 ||
    /[.!?。！？;；]$/u.test(compactValue) ||
    /[:：]/u.test(compactValue) ||
    resumeActionLineRegex.test(compactValue) ||
    (/[A-Za-z]/u.test(compactValue) && latinTokenCount > 6) ||
    resumeSectionHeadingRegex.test(compactValue) ||
    resumeStopSectionHeadingRegex.test(compactValue) ||
    resumeTechStackLabelRegex.test(compactValue) ||
    resumeSummaryLabelRegex.test(compactValue)
  ) {
    return false;
  }

  return /[\u4e00-\u9fffA-Za-z]/u.test(compactValue);
}

function findNextNonEmptyLine(rawLines: string[], startIndex: number) {
  for (let index = startIndex; index < rawLines.length; index += 1) {
    const nextLine = collapseWhitespace(rawLines[index] ?? "");

    if (nextLine.length > 0) {
      return nextLine;
    }
  }

  return null;
}

function looksLikeResumeProjectDetailLine(value: string | null) {
  if (!value) {
    return false;
  }

  return (
    projectBulletRegex.test(value) ||
    resumeTechStackLabelRegex.test(value) ||
    resumeSummaryLabelRegex.test(value) ||
    !looksLikeResumeProjectTitle(value)
  );
}

function buildResumeDeepDiveQuestions(input: {
  name: string;
  highlights: string[];
  techStack: string[];
}) {
  const questions = [
    `What problem was ${input.name} solving, and what part did you personally own?`,
    input.techStack.length > 0
      ? `Why did you choose ${input.techStack.slice(0, 2).join(" and ")} for ${input.name}?`
      : `What were the main design trade-offs in ${input.name}?`,
    input.highlights[0]
      ? `Walk through the hardest part of ${input.name} and how you delivered "${input.highlights[0]}".`
      : `What was the hardest production challenge in ${input.name}, and how did you handle it?`,
    `What outcome, metric, or business impact proves ${input.name} worked well?`,
  ];

  return Array.from(new Set(questions.map((question) => collapseWhitespace(question)))).slice(
    0,
    4,
  );
}

function extractCandidateName(rawLines: string[]) {
  const firstContentLine = rawLines.find(
    (line) =>
      line.length > 0 &&
      !resumeSectionHeadingRegex.test(line) &&
      !resumeStopSectionHeadingRegex.test(line) &&
      !contactLineRegex.test(line) &&
      !/[：:]/u.test(line),
  );

  if (!firstContentLine) {
    return null;
  }

  const candidateName = collapseWhitespace(firstContentLine);

  return candidateName.length <= 80 ? candidateName : null;
}

function extractResumeProfileSummary(rawLines: string[]) {
  const summaryLines: string[] = [];

  for (const rawLine of rawLines) {
    const line = collapseWhitespace(rawLine);

    if (
      line.length === 0 ||
      contactLineRegex.test(line) ||
      line === extractCandidateName(rawLines)
    ) {
      continue;
    }

    if (
      resumeSectionHeadingRegex.test(line) ||
      resumeStopSectionHeadingRegex.test(line) ||
      resumeProjectTitleLabelRegex.test(line)
    ) {
      break;
    }

    summaryLines.push(line);

    if (summaryLines.length >= 2) {
      break;
    }
  }

  return summaryLines.length > 0 ? truncateText(summaryLines.join(" / "), 200) : null;
}

function extractResumeProjectBlocks(rawLines: string[]) {
  const projects: Array<{
    title: string;
    lines: string[];
  }> = [];
  let inProjectSection = false;
  let currentProject:
    | {
        title: string;
        lines: string[];
      }
    | undefined;

  function flushCurrentProject() {
    if (!currentProject) {
      return;
    }

    projects.push(currentProject);
    currentProject = undefined;
  }

  for (let index = 0; index < rawLines.length; index += 1) {
    const rawLine = rawLines[index] ?? "";
    const line = collapseWhitespace(rawLine);

    if (line.length === 0) {
      continue;
    }

    if (resumeSectionHeadingRegex.test(line)) {
      inProjectSection = true;
      flushCurrentProject();
      continue;
    }

    if (inProjectSection && resumeStopSectionHeadingRegex.test(line)) {
      flushCurrentProject();
      inProjectSection = false;
      continue;
    }

    const labeledProjectMatch = line.match(resumeProjectTitleLabelRegex);
    const datedProjectMatch = line.match(dateRangeProjectRegex);

    if (labeledProjectMatch || datedProjectMatch) {
      inProjectSection = true;
      flushCurrentProject();
      currentProject = {
        title: collapseWhitespace(
          stripBulletPrefix((labeledProjectMatch ?? datedProjectMatch)?.[1] ?? line),
        ),
        lines: [],
      };
      continue;
    }

    if (!inProjectSection) {
      continue;
    }

    if (
      looksLikeResumeProjectTitle(line) &&
      (!currentProject ||
        (currentProject.lines.length > 0 &&
          looksLikeResumeProjectDetailLine(findNextNonEmptyLine(rawLines, index + 1))))
    ) {
      flushCurrentProject();
      currentProject = {
        title: collapseWhitespace(stripBulletPrefix(line)),
        lines: [],
      };
      continue;
    }

    if (currentProject) {
      currentProject.lines.push(line);
    }
  }

  flushCurrentProject();

  return projects;
}

function buildResumeProjectCandidate(block: { title: string; lines: string[] }) {
  const highlights: string[] = [];
  const summaryLines: string[] = [];
  const techStack = new Set<string>();

  for (const line of block.lines) {
    const techStackMatch = line.match(resumeTechStackLabelRegex);

    if (techStackMatch) {
      for (const tech of splitCommaLikeValues(techStackMatch[1])) {
        techStack.add(tech);
      }
      continue;
    }

    const summaryMatch = line.match(resumeSummaryLabelRegex);

    if (summaryMatch) {
      summaryLines.push(summaryMatch[1]);
      continue;
    }

    const bulletMatch = line.match(projectBulletRegex);

    if (bulletMatch) {
      highlights.push(collapseWhitespace(bulletMatch[1]));
      continue;
    }

    if (summaryLines.length === 0) {
      summaryLines.push(line);
      continue;
    }

    highlights.push(line);
  }

  const inferredTechStack = inferTechStack(
    `${block.title} ${summaryLines.join(" ")} ${highlights.join(" ")}`,
  );

  for (const tech of inferredTechStack) {
    techStack.add(tech);
  }

  const normalizedHighlights = Array.from(
    new Set(
      highlights
        .map((highlight) => collapseWhitespace(stripBulletPrefix(highlight)))
        .filter((highlight) => highlight.length > 0),
    ),
  ).slice(0, 5);
  const summary =
    summaryLines.length > 0
      ? truncateText(summaryLines.join(" / "), 220)
      : normalizedHighlights[0] ?? null;

  return {
    name: collapseWhitespace(block.title),
    summary,
    highlights: normalizedHighlights,
    tech_stack: Array.from(techStack).slice(0, 8),
    deep_dive_questions: buildResumeDeepDiveQuestions({
      name: collapseWhitespace(block.title),
      highlights: normalizedHighlights,
      techStack: Array.from(techStack),
    }),
  };
}

function extractResumeProjects(rawText: string) {
  const rawLines = rawText.split(/\r?\n/u).map((line) => line.trim());
  const blocks = extractResumeProjectBlocks(rawLines);

  if (blocks.length === 0) {
    return [];
  }

  return blocks
    .map(buildResumeProjectCandidate)
    .filter((project) => project.name.length > 0);
}

function buildResumeResult(input: ParseSourceInput, lines: string[]): ParseResult {
  const rawLines = input.rawText.split(/\r?\n/u).map((line) => line.trim());
  const resumeProjects = extractResumeProjects(input.rawText);
  const candidateName = extractCandidateName(rawLines);
  const profileSummary = extractResumeProfileSummary(rawLines);
  const sourceSummary =
    profileSummary ??
    (candidateName
      ? `${candidateName}${resumeProjects.length > 0 ? ` • ${resumeProjects.length} projects` : ""}`
      : buildSourceSummary(input.title, lines, null));

  return parseResultSchema.parse({
    source_summary: sourceSummary,
    source_kind_guess: "resume",
    questions: [],
    resume_projects: resumeProjects,
    warnings:
      resumeProjects.length === 0
        ? [
            "No structured projects were extracted from this resume. Keep the raw source, inspect section headings, and retry with clearer project blocks if needed.",
          ]
        : [],
  });
}

function buildManualInputResult(input: ParseSourceInput, lines: string[]): ParseResult {
  return parseResultSchema.parse({
    source_summary: buildSourceSummary(input.title, lines, null),
    source_kind_guess: "manual_input",
    questions: [],
    warnings: ["Manual input 在当前产品流里直接进入 canonical，不走 parse review。"],
  });
}

/**
 * [POS] 负责把原始 source 文本转换成 review 阶段可消费的 parse candidates。
 * [IN] ParseSourceInput，包含 source kind、title、rawText、jobType 与可选 canonical vocabulary。
 * [OUT] 返回符合 parse-result schema 的结构化结果；当 interview LLM 路径失败时，默认退化到启发式候选并附带 warning。
 *
 * @feature open-interview-server-core-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */
export const openClawParseSourceAdapter = {
  async parse(input: ParseSourceInput) {
    const lines = splitLines(input.rawText);

    if (input.jobType === "extract_resume") {
      return buildResumeResult(input, lines);
    }

    if (input.jobType === "normalize_manual_input") {
      return buildManualInputResult(input, lines);
    }

    try {
      if (input.rawText.length > interviewChunkingThresholdChars) {
        return await buildChunkedInterviewResultFromLlm(input, lines);
      }

      return await buildInterviewResultFromLlm(input, lines);
    } catch (error) {
      if (!isHeuristicInterviewFallbackEnabled()) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "LLM-backed interview parsing failed.";

      return withPrependedWarning(
        buildHeuristicInterviewResult(input, lines),
        `Heuristic fallback was used because the LLM-backed parse path failed: ${truncateText(message, 220)}`,
      );
    }
  },
};
