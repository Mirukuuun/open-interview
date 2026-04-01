import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

type TestContext = {
  tempDir: string;
  sqlite: InstanceType<typeof import("better-sqlite3").default>;
  parseJobRepository: typeof import("../src/server/repositories").parseJobRepository;
  parseReviewService: typeof import("../src/server/services/parse-review-service").parseReviewService;
  questionRepository: typeof import("../src/server/repositories").questionRepository;
  questionBankService: typeof import("../src/server/services/question-bank-service").questionBankService;
  interviewBrowseService: typeof import("../src/server/services/interview-browse-service").interviewBrowseService;
  interviewQuestionService: typeof import("../src/server/services/interview-question-service").interviewQuestionService;
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
    path.join(os.tmpdir(), "open-interview-interview-question-"),
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
    { parseReviewService },
    { questionBankService },
    { interviewBrowseService },
    { interviewQuestionService },
    { parseJobRepository, questionRepository, sourceDocumentRepository },
  ] = await Promise.all([
    import("../src/server/db/client"),
    import("../src/server/services/parse-review-service"),
    import("../src/server/services/question-bank-service"),
    import("../src/server/services/interview-browse-service"),
    import("../src/server/services/interview-question-service"),
    import("../src/server/repositories"),
  ]);

  currentContext = {
    tempDir,
    sqlite,
    parseJobRepository,
    parseReviewService,
    questionRepository,
    questionBankService,
    interviewBrowseService,
    interviewQuestionService,
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

describe("interview question decoupling", () => {
  it("confirms interview parse jobs into interview questions without auto-writing question bank items", async () => {
    const {
      sqlite,
      parseJobRepository,
      parseReviewService,
      sourceDocumentRepository,
    } = await createTestContext();

    const sourceDocument = sourceDocumentRepository.create({
      kind: "interview_experience",
      title: "字节后端一面面经",
      rawText: "Redis 分布式锁会遇到哪些问题？",
      parseStatus: "needs_review",
    });
    const parseJob = parseJobRepository.create({
      sourceDocumentId: sourceDocument.id,
      jobType: "extract_interview",
      status: "needs_review",
      resultJson: {
        interview_experience: {
          company: "字节",
          role: "后端开发",
          round_info: "一面",
          summary: "Redis + 并发",
          tags: ["redis"],
        },
        questions: [
          {
            question_text: "Redis 分布式锁会遇到哪些问题？",
            answer: "需要考虑续约、误删和主从切换。",
            category: "distributed_system",
            tags: ["redis", "lock"],
          },
        ],
      },
    });

    if (!parseJob) {
      throw new Error("Failed to create interview parse job.");
    }

    parseReviewService.confirmParseJob(parseJob.id, {
      interview_experience: {
        company: "字节",
        role: "后端开发",
        round_info: "一面",
        summary: "Redis + 并发",
        tags: ["redis"],
      },
      questions: [
        {
          action: "keep",
          question_text: "Redis 分布式锁会遇到哪些问题？",
          answer: "需要考虑续约、误删和主从切换。",
          category: "distributed_system",
          tags: ["redis", "lock"],
        },
      ],
    });

    const interviewQuestionCount = Number(
      (
        sqlite
          .prepare("SELECT COUNT(*) AS count FROM interview_questions")
          .get() as { count: number } | undefined
      )?.count ?? 0,
    );
    const questionItemCount = Number(
      (
        sqlite
          .prepare("SELECT COUNT(*) AS count FROM question_items")
          .get() as { count: number } | undefined
      )?.count ?? 0,
    );

    expect(interviewQuestionCount).toBe(1);
    expect(questionItemCount).toBe(0);
  });

  it("shows recommended bank questions for newly confirmed interview questions", async () => {
    const {
      parseJobRepository,
      parseReviewService,
      questionRepository,
      interviewBrowseService,
      sourceDocumentRepository,
    } = await createTestContext();

    const suggestedQuestion = questionRepository.create({
      questionText: "Redis 分布式锁有哪些风险？",
      canonicalAnswer: "需要关注时钟漂移、误删和续约。",
      category: "distributed_system",
      reviewStatus: "active",
      createdFrom: "manual",
    });
    questionRepository.replaceTags(suggestedQuestion.id, ["redis", "lock"]);

    const sourceDocument = sourceDocumentRepository.create({
      kind: "interview_experience",
      title: "美团后端一面面经",
      rawText: "Redis 分布式锁会遇到哪些问题？",
      parseStatus: "needs_review",
    });
    const parseJob = parseJobRepository.create({
      sourceDocumentId: sourceDocument.id,
      jobType: "extract_interview",
      status: "needs_review",
      resultJson: {
        interview_experience: {
          company: "美团",
          role: "后端开发",
          round_info: "一面",
          summary: "Redis 基础",
          tags: ["redis"],
        },
        questions: [
          {
            question_text: "Redis 分布式锁会遇到哪些问题？",
            answer: "要看误删、续约和可用性。",
            category: "distributed_system",
            tags: ["redis", "lock"],
          },
        ],
      },
    });

    if (!parseJob) {
      throw new Error("Failed to create interview parse job.");
    }

    const confirmResult = parseReviewService.confirmParseJob(parseJob.id, {
      interview_experience: {
        company: "美团",
        role: "后端开发",
        round_info: "一面",
        summary: "Redis 基础",
        tags: ["redis"],
      },
      questions: [
        {
          action: "keep",
          question_text: "Redis 分布式锁会遇到哪些问题？",
          answer: "要看误删、续约和可用性。",
          category: "distributed_system",
          tags: ["redis", "lock"],
        },
      ],
    });

    const interview = interviewBrowseService.getInterviewDetail(
      confirmResult.importSummary.createdInterviewExperienceId ?? "",
    );

    expect(interview?.questions).toHaveLength(1);
    expect(interview?.questions[0]?.recommendedQuestions[0]?.id).toBe(
      suggestedQuestion.id,
    );
  });

  it("promotes interview questions by merge without overwriting an existing canonical answer", async () => {
    const {
      parseJobRepository,
      parseReviewService,
      questionRepository,
      questionBankService,
      interviewBrowseService,
      interviewQuestionService,
      sourceDocumentRepository,
    } = await createTestContext();

    const existingQuestion = questionRepository.create({
      questionText: "Redis 分布式锁有哪些风险？",
      canonicalAnswer: "成熟题库答案",
      category: "distributed_system",
      reviewStatus: "active",
      createdFrom: "manual",
    });
    questionRepository.replaceTags(existingQuestion.id, ["redis"]);
    questionRepository.createAnswerVariant({
      questionItemId: existingQuestion.id,
      variantType: "canonical",
      content: "成熟题库答案",
      authorType: "user",
    });

    const sourceDocument = sourceDocumentRepository.create({
      kind: "interview_experience",
      title: "京东后端一面面经",
      rawText: "Redis 分布式锁会遇到哪些问题？",
      parseStatus: "needs_review",
    });
    const parseJob = parseJobRepository.create({
      sourceDocumentId: sourceDocument.id,
      jobType: "extract_interview",
      status: "needs_review",
      resultJson: {
        questions: [
          {
            question_text: "Redis 分布式锁会遇到哪些问题？",
            answer: "来源答案",
            category: "distributed_system",
            tags: ["redis", "lock"],
          },
        ],
      },
    });

    if (!parseJob) {
      throw new Error("Failed to create interview parse job.");
    }

    const confirmResult = parseReviewService.confirmParseJob(parseJob.id, {
      interview_experience: null,
      questions: [
        {
          action: "keep",
          question_text: "Redis 分布式锁会遇到哪些问题？",
          answer: "来源答案",
          category: "distributed_system",
          tags: ["redis", "lock"],
        },
      ],
    });
    const interview = interviewBrowseService.getInterviewDetail(
      confirmResult.importSummary.createdInterviewExperienceId ?? "",
    );
    const interviewQuestionId = interview?.questions[0]?.id;

    if (!interviewQuestionId) {
      throw new Error("Interview question should exist after confirmation.");
    }

    const promotion = interviewQuestionService.promoteInterviewQuestion(
      interviewQuestionId,
      {
        action: "merge",
        target_question_id: existingQuestion.id,
      },
    );
    const refreshedQuestion = questionRepository.findById(existingQuestion.id);
    const detail = questionBankService.getQuestionDetail(existingQuestion.id);

    expect(promotion.questionItemId).toBe(existingQuestion.id);
    expect(refreshedQuestion?.canonicalAnswer).toBe("成熟题库答案");
    expect(
      detail?.linkedInterviewQuestions.some(
        (linkedQuestion) =>
          linkedQuestion.interviewQuestionId === interviewQuestionId &&
          linkedQuestion.linkType === "promoted_merge",
      ),
    ).toBe(true);
  });
});
