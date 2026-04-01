import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

type TestContext = {
  tempDir: string;
  sqlite: InstanceType<typeof import("better-sqlite3").default>;
  importService: typeof import("../src/server/services/import-service").importService;
  parseReviewService: typeof import("../src/server/services/parse-review-service").parseReviewService;
  parseJobRepository: typeof import("../src/server/repositories").parseJobRepository;
  questionRepository: typeof import("../src/server/repositories").questionRepository;
  sourceDocumentRepository: typeof import("../src/server/repositories").sourceDocumentRepository;
};

const globalForDatabase = globalThis as {
  openInterviewSqlite?: {
    close: () => void;
  };
};

let currentContext: TestContext | null = null;

async function createTestContext() {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "open-interview-single-answer-"),
  );
  const databasePath = path.join(tempDir, "open-interview.sqlite");

  process.env.OPEN_INTERVIEW_DB_PATH = databasePath;
  globalForDatabase.openInterviewSqlite?.close();
  delete globalForDatabase.openInterviewSqlite;
  vi.resetModules();

  execFileSync("node", ["scripts/db/init.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      OPEN_INTERVIEW_DB_PATH: databasePath,
    },
  });

  const [
    { sqlite },
    { importService },
    { parseReviewService },
    { parseJobRepository, questionRepository, sourceDocumentRepository },
  ] = await Promise.all([
    import("../src/server/db/client"),
    import("../src/server/services/import-service"),
    import("../src/server/services/parse-review-service"),
    import("../src/server/repositories"),
  ]);

  currentContext = {
    tempDir,
    sqlite,
    importService,
    parseReviewService,
    parseJobRepository,
    questionRepository,
    sourceDocumentRepository,
  };

  return currentContext;
}

afterEach(() => {
  currentContext?.sqlite.close();
  delete globalForDatabase.openInterviewSqlite;

  if (currentContext) {
    fs.rmSync(currentContext.tempDir, {
      recursive: true,
      force: true,
    });
  }

  currentContext = null;
  delete process.env.OPEN_INTERVIEW_DB_PATH;
  vi.resetModules();
});

describe("single-answer question bank", () => {
  it("prefers the uploaded source answer when confirming a merged parse result", async () => {
    const {
      parseJobRepository,
      parseReviewService,
      questionRepository,
      sourceDocumentRepository,
    } = await createTestContext();

    const sourceDocument = sourceDocumentRepository.create({
      kind: "knowledge_note",
      title: "Java 并发",
      rawText: "线程和进程相关笔记",
      parseStatus: "needs_review",
    });
    const existingQuestion = questionRepository.create({
      questionText: "线程和进程有什么区别？",
      canonicalAnswer: "旧主答案",
      category: "java_concurrency",
      reviewStatus: "active",
      createdFrom: "manual",
    });

    questionRepository.createAnswerVariant({
      questionItemId: existingQuestion.id,
      variantType: "canonical",
      content: "旧主答案",
      authorType: "user",
    });

    const parseJob = parseJobRepository.create({
      sourceDocumentId: sourceDocument.id,
      jobType: "extract_interview",
      status: "needs_review",
      resultJson: {
        questions: [
          {
            question_text: existingQuestion.questionText,
            answer: "上传原文答案",
            category: "java_concurrency",
            tags: ["thread"],
          },
        ],
      },
    });

    if (!parseJob) {
      throw new Error("Failed to create parse job for test.");
    }

    parseReviewService.confirmParseJob(parseJob.id, {
      interview_experience: null,
      questions: [
        {
          action: "merge",
          target_question_id: existingQuestion.id,
          question_text: existingQuestion.questionText,
          answer: "上传原文答案",
          category: "java_concurrency",
          tags: ["thread"],
        },
      ],
    });

    const refreshedQuestion = questionRepository.findById(existingQuestion.id);
    const answerVariants = questionRepository.listAnswerVariants(existingQuestion.id);

    expect(refreshedQuestion?.canonicalAnswer).toBe("上传原文答案");
    expect(
      answerVariants.some(
        (answerVariant) =>
          answerVariant.variantType === "canonical" &&
          answerVariant.content === "上传原文答案",
      ),
    ).toBe(true);
    expect(
      answerVariants.some(
        (answerVariant) => answerVariant.variantType === "personal",
      ),
    ).toBe(false);
  });

  it("overwrites the main answer during manual Q&A import instead of creating a personal answer", async () => {
    const { importService, questionRepository } = await createTestContext();

    const existingQuestion = questionRepository.create({
      questionText: "ThreadLocal 会导致什么问题？",
      canonicalAnswer: "旧主答案",
      category: "java_concurrency",
      reviewStatus: "active",
      createdFrom: "manual",
    });

    questionRepository.createAnswerVariant({
      questionItemId: existingQuestion.id,
      variantType: "canonical",
      content: "旧主答案",
      authorType: "user",
    });

    const result = importService.createManualQa({
      questionText: existingQuestion.questionText,
      answerText: "线程池复用下如果不清理，可能导致脏数据和内存泄漏。",
      categories: ["java_concurrency"],
      tags: ["threadlocal"],
    });
    const refreshedQuestion = questionRepository.findById(existingQuestion.id);
    const answerVariants = questionRepository.listAnswerVariants(existingQuestion.id);

    expect(refreshedQuestion?.canonicalAnswer).toBe(
      "线程池复用下如果不清理，可能导致脏数据和内存泄漏。",
    );
    expect(result.answerVariant.variantType).toBe("canonical");
    expect(
      answerVariants.some(
        (answerVariant) =>
          answerVariant.content ===
            "线程池复用下如果不清理，可能导致脏数据和内存泄漏。" &&
          answerVariant.variantType === "canonical",
      ),
    ).toBe(true);
    expect(
      answerVariants.some(
        (answerVariant) =>
          answerVariant.content ===
            "线程池复用下如果不清理，可能导致脏数据和内存泄漏。" &&
          answerVariant.variantType === "personal",
      ),
    ).toBe(false);
  });
});
