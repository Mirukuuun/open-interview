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
