import { afterEach, describe, expect, it, vi } from "vitest";

import { answerGroundedQa } from "../src/server/retrieval/qa-grounded-answer-chain";
import {
  buildQaRetrievalSummary,
  classifyQaSupportLevel,
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
});

describe("qa grounded answer chain", () => {
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

  it("keeps grounded answer mode while building support summary from local citations", async () => {
    vi.spyOn(openClawLlmClient, "createJsonObject").mockResolvedValue({
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

    expect(result.answerMode).toBe("grounded_answered");
    expect(result.answer).toContain("误删");
    expect(result.supportSummary).toContain("2 条引用");
  });
});
