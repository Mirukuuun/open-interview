import { afterEach, describe, expect, it, vi } from "vitest";

import { openClawParseSourceAdapter } from "../src/server/adapters/openclaw/parse-source";
import { openClawLlmClient } from "../src/server/adapters/openclaw/llm-client";

const markdownInterviewText = `
# Java并发

### 什么是线程和进程？
进程是程序的一次执行过程，是系统运行程序的基本单位。
线程是比进程更小的执行单位，同一进程中的线程会共享堆和方法区。

### ThreadLocal 有什么风险？
线程池复用线程时如果不清理 ThreadLocal，可能出现脏数据和内存泄漏风险。
`.trim();

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPEN_INTERVIEW_ALLOW_HEURISTIC_INTERVIEW_PARSE_FALLBACK;
});

describe("openClawParseSourceAdapter", () => {
  it("sends a chinese-only parse prompt to the LLM path", async () => {
    const createJsonObjectSpy = vi
      .spyOn(openClawLlmClient, "createJsonObject")
      .mockResolvedValue({
        source_summary: "关于 Java 并发基础概念的知识笔记。",
        source_kind_guess: "interview_experience",
        interview_experience: null,
        questions: [
          {
            question_text: "什么是线程和进程？",
            canonical_answer: "线程是进程内更小的执行单元。",
            source_answer: "进程是程序的一次执行过程。",
            category: "java_concurrency",
            tags: ["concurrency"],
            confidence: 0.9,
          },
        ],
        warnings: [],
      });

    await openClawParseSourceAdapter.parse({
      kind: "interview_experience",
      title: "Java并发",
      rawText: markdownInterviewText,
      jobType: "extract_interview",
      canonicalVocabulary: {
        categories: ["java_concurrency"],
        tags: ["concurrency"],
      },
    });

    const request = createJsonObjectSpy.mock.calls[0]?.[0];

    expect(request?.instructions).toContain("All natural-language fields in the JSON must use Simplified Chinese");
    expect(request?.input).toContain("Use Simplified Chinese for all natural-language JSON fields");
    expect(request?.input).toContain("canonical_answer should be written in concise Simplified Chinese");
  });

  it("falls back to heuristic parsing for markdown interview notes when the LLM path fails", async () => {
    vi.spyOn(openClawLlmClient, "createJsonObject").mockRejectedValue(
      new Error("provider_http_error: Provider returned HTTP 404 (Not Found)."),
    );

    const result = await openClawParseSourceAdapter.parse({
      kind: "interview_experience",
      title: "Java并发",
      rawText: markdownInterviewText,
      jobType: "extract_interview",
      canonicalVocabulary: {
        categories: ["java_concurrency"],
        tags: ["threadlocal", "concurrency"],
      },
    });

    expect(result.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.questions[0]?.question_text).toBe("什么是线程和进程？");
    expect(result.questions[0]?.source_answer).toContain("进程是程序的一次执行过程");
    expect(result.questions[1]?.question_text).toBe("ThreadLocal 有什么风险？");
    expect(result.questions[1]?.tags).toContain("threadlocal");
    const firstWarning = result.warnings?.[0] ?? "";

    expect(firstWarning).toContain("Heuristic fallback was used");
    expect(firstWarning).toContain("provider_http_error");
  });

  it("allows explicitly disabling heuristic fallback", async () => {
    process.env.OPEN_INTERVIEW_ALLOW_HEURISTIC_INTERVIEW_PARSE_FALLBACK = "0";

    vi.spyOn(openClawLlmClient, "createJsonObject").mockRejectedValue(
      new Error("provider_http_error: Provider returned HTTP 404 (Not Found)."),
    );

    await expect(
      openClawParseSourceAdapter.parse({
        kind: "interview_experience",
        title: "Java并发",
        rawText: markdownInterviewText,
        jobType: "extract_interview",
      }),
    ).rejects.toThrow("provider_http_error");
  });
});
