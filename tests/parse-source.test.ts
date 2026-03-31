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

const layeredNetworkText = `
# 计网

### 七层分类模型介绍一下
应用层、表示层、会话层、传输层、网络层、数据链路层、物理层

1. 应用层：为计算机用户提供服务
2. 表示层：进行数据处理，如编码解码，加密解密，压缩解压缩
3. 会话层：管理两个应用程序之间的通信
4. 传输层：为两个用户之前的通信提供传输服务
5. 网络层：路由和寻址
6. 数据链路层：进行帧编码和误差纠正控制
7. 物理层：进行比特流传输
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
    expect(request?.instructions).toContain("preserve the full raw answer span");
    expect(request?.input).toContain("Use Simplified Chinese for all natural-language JSON fields");
    expect(request?.input).toContain("canonical_answer should be written in concise Simplified Chinese");
    expect(request?.input).toContain("source_answer must preserve the full answer span");
    expect(request?.input).toContain("return fewer questions instead of shortening source_answer");
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

  it("expands abbreviated source answers with heuristic source spans", async () => {
    vi.spyOn(openClawLlmClient, "createJsonObject").mockResolvedValue({
      source_summary: "关于 OSI 分层模型的网络知识笔记。",
      source_kind_guess: "interview_experience",
      interview_experience: null,
      questions: [
        {
          question_text: "介绍一下OSI七层模型和各层作用",
          canonical_answer:
            "OSI七层包括应用层、表示层、会话层、传输层、网络层、数据链路层、物理层。",
          source_answer:
            "应用层、表示层、会话层、传输层、网络层、数据链路层、物理层",
          category: "networking",
          tags: ["network"],
          confidence: 0.94,
        },
      ],
      warnings: [],
    });

    const result = await openClawParseSourceAdapter.parse({
      kind: "interview_experience",
      title: "计网",
      rawText: layeredNetworkText,
      jobType: "extract_interview",
      canonicalVocabulary: {
        categories: ["networking"],
        tags: ["network"],
      },
    });

    expect(result.questions[0]?.source_answer).toContain(
      "1. 应用层：为计算机用户提供服务",
    );
    expect(result.questions[0]?.source_answer).toContain(
      "7. 物理层：进行比特流传输",
    );
    expect(result.warnings?.[0]).toContain("Expanded 1 source_answer");
  });

  it('recognizes "介绍一下" headings in heuristic interview parsing', async () => {
    vi.spyOn(openClawLlmClient, "createJsonObject").mockRejectedValue(
      new Error("provider_http_error: Provider returned HTTP 404 (Not Found)."),
    );

    const result = await openClawParseSourceAdapter.parse({
      kind: "interview_experience",
      title: "计网",
      rawText: layeredNetworkText,
      jobType: "extract_interview",
      canonicalVocabulary: {
        categories: ["networking"],
        tags: ["network"],
      },
    });

    expect(result.questions[0]?.question_text).toBe("七层分类模型介绍一下");
    expect(result.questions[0]?.source_answer).toContain(
      "7. 物理层：进行比特流传输",
    );
  });
});
