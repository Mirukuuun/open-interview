import { describe, expect, it } from "vitest";

import {
  buildInterviewParsePrompt,
  interviewParseInstructions,
  interviewParsePromptVersion,
} from "../src/server/prompts/interview-parse-prompt";
import {
  formatQaGroundedAnswerCitations,
  formatQaGroundedAnswerQuestionContexts,
  formatQaGroundedAnswerSessionHistory,
  qaGroundedAnswerInstructions,
} from "../src/server/prompts/qa-grounded-answer-prompt";
import {
  formatQaRewriteSessionHistory,
  qaRewriteInstructions,
} from "../src/server/prompts/qa-rewrite-prompt";
import {
  buildPracticeGradingPromptInput,
  practiceGradingInstructions,
} from "../src/server/prompts/practice-grading-prompt";

describe("prompt markdown loader", () => {
  it("loads the interview parse prompt from markdown with localized template text", () => {
    expect(interviewParsePromptVersion).toBe("extract_interview_v4");
    expect(interviewParseInstructions).toContain("只返回单个 JSON 对象");
    expect(interviewParseInstructions).toContain("面向面试回答");

    const prompt = buildInterviewParsePrompt(
      {
        kind: "interview_experience",
        title: "Java 并发",
        sourceText: "问题：ThreadLocal 有什么风险？",
        canonicalVocabulary: {
          categories: ["java_concurrency"],
          tags: ["threadlocal"],
        },
      },
      {
        chunkIndex: 2,
        chunkCount: 3,
      },
    );

    expect(prompt).toContain("提示词版本：extract_interview_v4");
    expect(prompt).toContain("分片：2 / 3");
    expect(prompt).toContain("规范词表（如相关请严格复用原值）");
    expect(prompt).toContain("- 分类：java_concurrency");
    expect(prompt).toContain("- 标签：threadlocal");
    expect(prompt).toContain("`answer` 是当前题目的唯一候选答案字段。");
    expect(prompt).not.toContain("宁可少返回几个问题");
    expect(prompt).toContain("原始文本：");
  });

  it("renders localized QA prompt wrappers from markdown", () => {
    expect(qaRewriteInstructions).toContain("仅返回 JSON");
    expect(
      formatQaRewriteSessionHistory([
        {
          role: "user",
          content: " Redis 分布式锁这题怎么答？ ",
        },
      ]),
    ).toBe("用户：Redis 分布式锁这题怎么答？");

    expect(qaGroundedAnswerInstructions).toContain("面试回答");
    expect(
      formatQaGroundedAnswerSessionHistory([
        {
          role: "assistant",
          content: " 先讲结论，再展开取舍。 ",
        },
      ]),
    ).toBe("助手：先讲结论，再展开取舍。");

    expect(
      formatQaGroundedAnswerCitations([
        {
          owner_type: "question_item",
          owner_id: "q_redis_lock_001",
          label: "Redis 分布式锁会遇到哪些问题？",
          href: "/questions/q_redis_lock_001",
          snippet: "需要考虑误删、续约和主从切换一致性。",
          source_document: {
            id: "source_redis_001",
            title: "Redis 题库",
          },
        },
      ]),
    ).toContain("来源：Redis 题库");

    expect(
      formatQaGroundedAnswerQuestionContexts([
        {
          questionText: "Redis 分布式锁会遇到哪些问题？",
          canonicalAnswer: "需要考虑误删、续约和主从切换一致性。",
          personalAnswer: null,
          sourceSnippet: "误删通常发生在锁超时后。",
        },
      ]),
    ).toContain("标准答案：需要考虑误删、续约和主从切换一致性。");
  });

  it("builds the practice grading input from markdown sections", () => {
    expect(practiceGradingInstructions).toContain("资深中文技术面试官");

    const promptInput = buildPracticeGradingPromptInput([
      {
        sequenceNo: 1,
        questionTextSnapshot: "缓存击穿和缓存雪崩有什么区别？",
        canonicalAnswerSnapshot: "需要分别说明高并发热点和大面积同时过期。",
        categorySnapshot: "distributed_system",
        tags: ["redis", "cache"],
        userAnswer: null,
      },
      {
        sequenceNo: 2,
        questionTextSnapshot: "MySQL 索引失效有哪些场景？",
        canonicalAnswerSnapshot: null,
        categorySnapshot: null,
        tags: [],
        userAnswer: "会和函数、隐式类型转换、最左前缀有关。",
      },
    ]);

    expect(promptInput).toContain("题号：1");
    expect(promptInput).toContain("用户回答：未作答");
    expect(promptInput).toContain("标签：redis, cache");
    expect(promptInput).toContain("标准答案：无");
    expect(promptInput).toContain("分类：未分类");
    expect(promptInput).toContain("\n\n---\n\n");
  });
});
