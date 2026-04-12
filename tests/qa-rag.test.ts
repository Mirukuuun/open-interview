import { afterEach, describe, expect, it, vi } from "vitest";

import { answerGroundedQa } from "../src/server/retrieval/qa-grounded-answer-chain";
import { rewriteQaQuery } from "../src/server/retrieval/qa-rewrite-chain";
import {
  buildQaRetrievalSummary,
  classifyQaSupportLevel,
  filterQuestionsByDirectRelevance,
  questionMatchesQaFilters,
} from "../src/server/retrieval/qa-retrieval-support";
import { openClawLlmClient } from "../src/server/adapters/openclaw/llm-client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("qa retrieval support", () => {
  it("classifies grounded support when lexical and vector both contribute", () => {
    expect(
      classifyQaSupportLevel({
        citationCount: 2,
        questionCount: 2,
        lexicalHitCount: 3,
        vectorHitCount: 2,
      }),
    ).toBe("grounded_answered");
  });

  it("classifies no support when citations are missing", () => {
    expect(
      classifyQaSupportLevel({
        citationCount: 0,
        questionCount: 1,
        lexicalHitCount: 4,
        vectorHitCount: 1,
      }),
    ).toBe("no_grounded_support");
  });

  it("matches metadata filters against category, tag, company and role", () => {
    expect(
      questionMatchesQaFilters(
        {
          category: "system-design",
          tags: ["redis", "cache"],
          sources: [
            {
              interviewExperience: {
                company: "OpenAI",
                role: "Backend Engineer",
              },
            },
          ],
        },
        {
          categories: ["system-design"],
          tags: ["redis"],
          companies: ["OpenAI"],
          roles: ["Backend Engineer"],
        },
      ),
    ).toBe(true);
  });

  it("builds a readable retrieval summary", () => {
    expect(
      buildQaRetrievalSummary({
        questionCount: 2,
        citationCount: 3,
        lexicalHitCount: 6,
        vectorHitCount: 4,
        rewriteApplied: true,
        answerMode: "grounded_answered",
      }),
    ).toContain("已应用 history-aware rewrite");
  });

  it("drops weakly related vector-only questions when the query signal is narrow", () => {
    const filteredQuestions = filterQuestionsByDirectRelevance("我问你的事持久性", [
      {
        questionText: "事务的四大特性是什么？",
        canonicalAnswer:
          "ACID包括原子性、一致性、隔离性、持久性。持久性由 redo log 保证。",
        category: "database",
        tags: ["mysql"],
      },
      {
        questionText: "慢查询怎么解决？",
        canonicalAnswer: "可以先开启慢查询日志，再结合 explain 和索引优化处理。",
        category: "database",
        tags: ["mysql"],
      },
      {
        questionText: "介绍一下混合持久化方式",
        canonicalAnswer: "混合持久化结合了 RDB 和 AOF。",
        category: null,
        tags: ["redis"],
      },
    ]);

    expect(filteredQuestions).toHaveLength(1);
    expect(filteredQuestions[0]?.questionText).toBe("事务的四大特性是什么？");
  });
});

describe("qa grounded answer chain", () => {
  it("sends a localized rewrite prompt to the LLM", async () => {
    const createJsonObjectSpy = vi
      .spyOn(openClawLlmClient, "createJsonObject")
      .mockResolvedValue({
        rewrite_applied: true,
        rewritten_query: "Redis 分布式锁这题怎么答？",
        reason: "补全了上文指代。",
      });

    const result = await rewriteQaQuery({
      query: "这题怎么答？",
      sessionHistory: [
        {
          role: "user",
          content: "Redis 分布式锁会遇到哪些问题？",
        },
      ],
    });

    const request = createJsonObjectSpy.mock.calls[0]?.[0];

    expect(request?.instructions).toContain("仅返回 JSON");
    expect(request?.input).toContain("会话历史：");
    expect(request?.input).toContain("用户：Redis 分布式锁会遇到哪些问题？");
    expect(request?.input).toContain("当前问题：");
    expect(result.effectiveQuery).toBe("Redis 分布式锁这题怎么答？");
  });

  it("heuristically rewrites chinese correction follow-ups into standalone queries", async () => {
    const createJsonObjectSpy = vi.spyOn(openClawLlmClient, "createJsonObject");

    const result = await rewriteQaQuery({
      query: "我问你的事持久性",
      sessionHistory: [
        {
          role: "user",
          content: "mysql中事务的一致性怎么理解？",
        },
      ],
    });

    expect(createJsonObjectSpy).not.toHaveBeenCalled();
    expect(result.rewriteApplied).toBe(true);
    expect(result.effectiveQuery).toBe("mysql中事务的持久性怎么理解？");
  });

  it("returns a general fallback answer when local grounding is absent", async () => {
    vi.spyOn(openClawLlmClient, "createJsonObject").mockRejectedValue(
      new Error("provider unavailable"),
    );

    const result = await answerGroundedQa({
      query: "请你做个自我介绍",
      effectiveQuery: "请你做个自我介绍",
      supportLevel: "no_grounded_support",
      sessionHistory: [],
      citations: [],
      questionContexts: [],
    });

    expect(result.answerMode).toBe("no_grounded_support");
    expect(result.answer).toContain("1 分钟版本");
    expect(result.supportSummary).toContain("本地题库暂未检索到直接依据");
  });

  it("keeps weak local support as a supplement during fallback instead of dumping context", async () => {
    vi.spyOn(openClawLlmClient, "createJsonObject").mockRejectedValue(
      new Error("provider unavailable"),
    );

    const result = await answerGroundedQa({
      query: "我问你的事持久性",
      effectiveQuery: "mysql中事务的持久性怎么理解？",
      supportLevel: "weak_support",
      sessionHistory: [
        {
          role: "user",
          content: "mysql中事务的一致性怎么理解？",
        },
      ],
      citations: [
        {
          owner_type: "question_item",
          owner_id: "q_mysql_tx_acid",
          label: "事务的四大特性是什么？",
          href: "/questions/q_mysql_tx_acid",
        },
      ],
      questionContexts: [
        {
          questionText: "事务的四大特性是什么？",
          canonicalAnswer:
            "ACID包括原子性、一致性、隔离性、持久性。持久性由 redo log 保证。",
          personalAnswer: null,
          sourceSnippet: null,
        },
      ],
    });

    expect(result.answerMode).toBe("weak_support");
    expect(result.answer).toContain("事务的持久性指的是");
    expect(result.answer).toContain("本地材料里的线索");
    expect(result.answer).not.toContain("结合当前本地材料，可以先这样回答：");
  });

  it("keeps grounded answer mode while building support summary from local citations", async () => {
    const createJsonObjectSpy = vi
      .spyOn(openClawLlmClient, "createJsonObject")
      .mockResolvedValue({
        answer: "你可以先讲结论，再展开误删、续约和主从切换一致性。",
      });

    const result = await answerGroundedQa({
      query: "Redis 分布式锁这题怎么答？",
      effectiveQuery: "Redis 分布式锁这题怎么答？",
      supportLevel: "grounded_answered",
      sessionHistory: [],
      citations: [
        {
          owner_type: "question_item",
          owner_id: "q_redis_lock_001",
          label: "Redis 分布式锁会遇到哪些问题？",
          href: "/questions/q_redis_lock_001",
        },
        {
          owner_type: "question_item",
          owner_id: "q_redlock_001",
          label: "RedLock 是否可靠？",
          href: "/questions/q_redlock_001",
        },
      ],
      questionContexts: [
        {
          questionText: "Redis 分布式锁会遇到哪些问题？",
          canonicalAnswer: "需要考虑误删、续约、主从切换一致性等。",
          personalAnswer: null,
          sourceSnippet: null,
        },
      ],
    });
    const request = createJsonObjectSpy.mock.calls[0]?.[0];

    expect(result.answerMode).toBe("grounded_answered");
    expect(result.answer).toContain("误删");
    expect(result.supportSummary).toContain("2 条引用");
    expect(request?.instructions).toContain("面试回答");
    expect(request?.input).toContain("本地依据上下文：");
    expect(request?.input).toContain("标准答案：需要考虑误删、续约");
    expect(request?.input).toContain("引用：");
  });
});
