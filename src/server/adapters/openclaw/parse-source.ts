import {
  parseResultSchema,
  type ParseInterviewExperience,
  type ParseQuestionCandidate,
  type ParseResult,
} from "@/lib/schemas/parse-result";
import { normalizeQuestionText } from "@/server/repositories/normalization";

type ParseSourceInput = {
  kind: "interview_experience" | "knowledge_note" | "resume" | "manual_input";
  title: string;
  rawText: string;
  jobType: "extract_interview" | "extract_resume" | "normalize_manual_input";
};

type CandidateBuffer = {
  questionText: string;
  answerLines: string[];
  confidence: number;
};

const questionLabelRegex =
  /^(?:q(?:uestion)?|question|问(?:题)?|题目|面试题|问题)\s*[:：]\s*(.+)$/iu;
const answerLabelRegex =
  /^(?:a(?:nswer)?|answer|答(?:案)?|回答|思路|解析)\s*[:：]\s*(.+)$/iu;
const bulletPrefixRegex = /^(?:[-*•]|\d+[.)、-])\s*/u;
const metadataPrefixRegex =
  /^(?:公司|company|岗位|role|职位|轮次|round|总结|summary|标签|tags?)\s*[:：]/iu;

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

function cleanQuestionText(value: string) {
  return collapseWhitespace(
    stripBulletPrefix(value)
      .replace(questionLabelRegex, "$1")
      .replace(/[：:]\s*$/u, ""),
  );
}

function cleanAnswerText(value: string) {
  return collapseWhitespace(value.replace(answerLabelRegex, "$1"));
}

function isQuestionLike(value: string) {
  const text = collapseWhitespace(stripBulletPrefix(value));

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

function finalizeCandidate(
  buffer: CandidateBuffer | undefined,
  dedupeMap: Map<string, ParseQuestionCandidate>,
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
  const existing = dedupeMap.get(normalizedQuestionText);
  const candidate: ParseQuestionCandidate = {
    question_text: questionText,
    canonical_answer: sourceAnswer || null,
    source_answer: sourceAnswer || null,
    category: inferCategory(combinedText),
    tags: inferTags(combinedText),
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

function extractQuestionCandidates(lines: string[]) {
  const dedupeMap = new Map<string, ParseQuestionCandidate>();
  let currentCandidate: CandidateBuffer | undefined;

  for (const line of lines) {
    const labeledQuestionMatch = line.match(questionLabelRegex);

    if (labeledQuestionMatch) {
      finalizeCandidate(currentCandidate, dedupeMap);
      currentCandidate = {
        questionText: labeledQuestionMatch[1],
        answerLines: [],
        confidence: questionConfidence(labeledQuestionMatch[1], true),
      };
      continue;
    }

    const strippedLine = stripBulletPrefix(line);

    if (isQuestionLike(strippedLine)) {
      finalizeCandidate(currentCandidate, dedupeMap);
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

  finalizeCandidate(currentCandidate, dedupeMap);

  return Array.from(dedupeMap.values());
}

function extractInterviewExperience(
  kind: ParseSourceInput["kind"],
  title: string,
  lines: string[],
) {
  if (kind === "resume" || kind === "manual_input") {
    return null;
  }

  const company = extractLabelValue(lines, ["公司", "company"]);
  const role = extractLabelValue(lines, ["岗位", "role", "职位"]);
  const roundInfo = extractLabelValue(lines, ["轮次", "round"]);
  const summary = extractLabelValue(lines, ["总结", "summary"]);
  const metadataTags = splitTagValues(extractLabelValue(lines, ["标签", "tags", "tag"]));
  const inferredTags = inferTags(`${title} ${lines.slice(0, 12).join(" ")}`);
  const tags = Array.from(new Set([...metadataTags, ...inferredTags])).slice(0, 8);

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

function buildResumeResult(input: ParseSourceInput, lines: string[]): ParseResult {
  return parseResultSchema.parse({
    source_summary: buildSourceSummary(input.title, lines, null),
    source_kind_guess: "resume",
    questions: [],
    resume_projects: [],
    warnings: ["Resume 结构化确认留到后续 slice，当前先保留可检查的 parse job 结果。"],
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

export const openClawParseSourceAdapter = {
  async parse(input: ParseSourceInput) {
    const lines = splitLines(input.rawText);

    if (input.jobType === "extract_resume") {
      return buildResumeResult(input, lines);
    }

    if (input.jobType === "normalize_manual_input") {
      return buildManualInputResult(input, lines);
    }

    const interviewExperience = extractInterviewExperience(
      input.kind,
      input.title,
      lines,
    );
    const summary = buildSourceSummary(input.title, lines, interviewExperience?.summary ?? null);
    const questions = extractQuestionCandidates(lines);

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
  },
};
