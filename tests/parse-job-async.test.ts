import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ParseResult } from "../src/lib/schemas/parse-result";

type TestContext = {
  tempDir: string;
  sqlite: InstanceType<typeof import("better-sqlite3").default>;
  openClawParseSourceAdapter: typeof import("../src/server/adapters/openclaw/parse-source").openClawParseSourceAdapter;
  parseJobRepository: typeof import("../src/server/repositories").parseJobRepository;
  parseReviewService: typeof import("../src/server/services/parse-review-service").parseReviewService;
  sourceDocumentRepository: typeof import("../src/server/repositories").sourceDocumentRepository;
};

const globalForDatabase = globalThis as {
  openInterviewSqlite?: {
    close: () => void;
  };
};

let currentContext: TestContext | null = null;

function initializeDatabase(databasePath: string) {
  const migrationsDir = path.join(
    process.cwd(),
    "src",
    "server",
    "db",
    "migrations",
  );
  const sqlite = new Database(databasePath);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __oi_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const insertMigration = sqlite.prepare(`
    INSERT INTO __oi_migrations (name, checksum, applied_at)
    VALUES (?, ?, ?)
  `);
  const readMigration = sqlite.prepare(`
    SELECT checksum
    FROM __oi_migrations
    WHERE name = ?
  `);

  for (const fileName of fs.readdirSync(migrationsDir).sort()) {
    if (!fileName.endsWith(".sql")) {
      continue;
    }

    const sqlText = fs.readFileSync(path.join(migrationsDir, fileName), "utf8");
    const checksum = createHash("sha256").update(sqlText).digest("hex");
    const existing = readMigration.get(fileName) as
      | {
          checksum: string;
        }
      | undefined;

    if (existing) {
      continue;
    }

    sqlite.exec(sqlText);
    insertMigration.run(fileName, checksum, new Date().toISOString());
  }

  sqlite.close();
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForCondition(
  predicate: () => boolean,
  timeoutMs = 1000,
  intervalMs = 10,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await delay(intervalMs);
  }

  throw new Error("Timed out while waiting for condition.");
}

async function createTestContext() {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "open-interview-parse-job-async-"),
  );
  const databasePath = path.join(tempDir, "open-interview.sqlite");

  process.env.OPEN_INTERVIEW_DB_PATH = databasePath;
  globalForDatabase.openInterviewSqlite?.close();
  delete globalForDatabase.openInterviewSqlite;
  vi.resetModules();

  initializeDatabase(databasePath);

  const [
    { sqlite },
    { openClawParseSourceAdapter },
    { parseReviewService },
    { parseJobRepository, sourceDocumentRepository },
  ] = await Promise.all([
    import("../src/server/db/client"),
    import("../src/server/adapters/openclaw/parse-source"),
    import("../src/server/services/parse-review-service"),
    import("../src/server/repositories"),
  ]);

  currentContext = {
    tempDir,
    sqlite,
    openClawParseSourceAdapter,
    parseJobRepository,
    parseReviewService,
    sourceDocumentRepository,
  };

  return currentContext;
}

afterEach(() => {
  vi.restoreAllMocks();

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

describe("parseReviewService async parse job execution", () => {
  it("returns pending immediately when creating a parse job and completes in background", async () => {
    const {
      openClawParseSourceAdapter,
      parseJobRepository,
      parseReviewService,
      sourceDocumentRepository,
    } = await createTestContext();

    const sourceDocument = sourceDocumentRepository.create({
      kind: "knowledge_note",
      title: "Java 并发笔记",
      rawText: "线程和进程的区别；ThreadLocal 的风险。",
    });
    const deferredParseResult = createDeferred<ParseResult>();

    const parseSpy = vi
      .spyOn(openClawParseSourceAdapter, "parse")
      .mockImplementation(() => deferredParseResult.promise);

    const createResult = await Promise.race([
      parseReviewService.createParseJob({
        sourceDocumentId: sourceDocument.id,
        jobType: "extract_interview",
      }),
      delay(100).then(() => "timed_out" as const),
    ]);

    expect(createResult).not.toBe("timed_out");

    if (createResult === "timed_out") {
      throw new Error("createParseJob should not wait for parse completion.");
    }

    expect(createResult.status).toBe("pending");
    expect(parseJobRepository.findById(createResult.id)?.status).toBe("pending");
    expect(sourceDocumentRepository.findById(sourceDocument.id)?.parseStatus).toBe(
      "pending",
    );

    await waitForCondition(() => parseSpy.mock.calls.length === 1);
    expect(parseJobRepository.findById(createResult.id)?.status).toBe("running");
    expect(sourceDocumentRepository.findById(sourceDocument.id)?.parseStatus).toBe(
      "running",
    );

    deferredParseResult.resolve({
      source_summary: "Java 并发基础问题",
      interview_experience: null,
      questions: [
        {
          question_text: "线程和进程有什么区别？",
          answer: "线程是比进程更小的执行单位。",
          category: "java_concurrency",
          tags: ["thread"],
          confidence: 0.92,
          merge_hint_question_id: null,
        },
      ],
      warnings: [],
    });

    await waitForCondition(
      () => parseJobRepository.findById(createResult.id)?.status === "needs_review",
    );

    const completedJob = parseJobRepository.findById(createResult.id);

    expect(completedJob?.status).toBe("needs_review");
    expect(completedJob?.attemptCount).toBe(1);
    expect(completedJob?.resultJson?.questions).toHaveLength(1);
    expect(sourceDocumentRepository.findById(sourceDocument.id)?.parseStatus).toBe(
      "needs_review",
    );
  });

  it("requeues a failed parse job immediately when retrying and completes in background", async () => {
    const {
      openClawParseSourceAdapter,
      parseJobRepository,
      parseReviewService,
      sourceDocumentRepository,
    } = await createTestContext();

    const sourceDocument = sourceDocumentRepository.create({
      kind: "interview_experience",
      title: "后端一面",
      rawText: "Redis 分布式锁相关问题。",
      parseStatus: "failed",
    });
    const parseJob = parseJobRepository.create({
      sourceDocumentId: sourceDocument.id,
      jobType: "extract_interview",
      status: "failed",
      attemptCount: 1,
      errorMessage: "provider timeout",
    });
    const deferredParseResult = createDeferred<ParseResult>();

    if (!parseJob) {
      throw new Error("Failed to create parse job for retry test.");
    }

    const parseSpy = vi
      .spyOn(openClawParseSourceAdapter, "parse")
      .mockImplementation(() => deferredParseResult.promise);

    const retryResult = await Promise.race([
      parseReviewService.retryParseJob(parseJob.id),
      delay(100).then(() => "timed_out" as const),
    ]);

    expect(retryResult).not.toBe("timed_out");

    if (retryResult === "timed_out") {
      throw new Error("retryParseJob should not wait for parse completion.");
    }

    expect(retryResult.status).toBe("pending");
    expect(retryResult.error_message).toBeNull();
    expect(parseJobRepository.findById(parseJob.id)?.status).toBe("pending");
    expect(sourceDocumentRepository.findById(sourceDocument.id)?.parseStatus).toBe(
      "pending",
    );

    await waitForCondition(() => parseSpy.mock.calls.length === 1);
    expect(parseJobRepository.findById(parseJob.id)?.status).toBe("running");

    deferredParseResult.resolve({
      source_summary: "Redis 分布式锁",
      interview_experience: null,
      questions: [
        {
          question_text: "Redis 分布式锁会遇到哪些问题？",
          answer: "要考虑误删和主从切换。",
          category: "distributed_system",
          tags: ["redis", "lock"],
          confidence: 0.88,
          merge_hint_question_id: null,
        },
      ],
      warnings: [],
    });

    await waitForCondition(
      () => parseJobRepository.findById(parseJob.id)?.status === "needs_review",
    );

    const completedJob = parseJobRepository.findById(parseJob.id);

    expect(completedJob?.status).toBe("needs_review");
    expect(completedJob?.attemptCount).toBe(2);
    expect(sourceDocumentRepository.findById(sourceDocument.id)?.parseStatus).toBe(
      "needs_review",
    );
  });

  it("requeues a needs_review parse job immediately when retrying and completes in background", async () => {
    const {
      openClawParseSourceAdapter,
      parseJobRepository,
      parseReviewService,
      sourceDocumentRepository,
    } = await createTestContext();

    const sourceDocument = sourceDocumentRepository.create({
      kind: "interview_experience",
      title: "缓存专题面经",
      rawText: "缓存一致性和穿透击穿雪崩相关问题。",
      parseStatus: "needs_review",
    });
    const parseJob = parseJobRepository.create({
      sourceDocumentId: sourceDocument.id,
      jobType: "extract_interview",
      status: "needs_review",
      attemptCount: 1,
      resultJson: {
        source_summary: "旧的缓存题候选",
        interview_experience: null,
        questions: [
          {
            question_text: "缓存穿透怎么处理？",
            answer: "布隆过滤器和空值缓存是常见手段。",
            category: "distributed_system",
            tags: ["cache"],
            confidence: 0.72,
            merge_hint_question_id: null,
          },
        ],
        warnings: [],
      },
    });
    const deferredParseResult = createDeferred<ParseResult>();

    if (!parseJob) {
      throw new Error("Failed to create parse job for needs_review retry test.");
    }

    const parseSpy = vi
      .spyOn(openClawParseSourceAdapter, "parse")
      .mockImplementation(() => deferredParseResult.promise);

    const retryResult = await Promise.race([
      parseReviewService.retryParseJob(parseJob.id),
      delay(100).then(() => "timed_out" as const),
    ]);

    expect(retryResult).not.toBe("timed_out");

    if (retryResult === "timed_out") {
      throw new Error("retryParseJob should not wait for parse completion.");
    }

    expect(retryResult.status).toBe("pending");
    expect(retryResult.error_message).toBeNull();
    expect(parseJobRepository.findById(parseJob.id)?.status).toBe("pending");
    expect(parseJobRepository.findById(parseJob.id)?.resultJson).toBeNull();
    expect(sourceDocumentRepository.findById(sourceDocument.id)?.parseStatus).toBe(
      "pending",
    );

    await waitForCondition(() => parseSpy.mock.calls.length === 1);
    expect(parseJobRepository.findById(parseJob.id)?.status).toBe("running");

    deferredParseResult.resolve({
      source_summary: "缓存一致性专题",
      interview_experience: null,
      questions: [
        {
          question_text: "缓存和数据库一致性怎么保证？",
          answer: "常见做法是延迟双删或基于 binlog 异步修正。",
          category: "distributed_system",
          tags: ["cache", "consistency"],
          confidence: 0.9,
          merge_hint_question_id: null,
        },
      ],
      warnings: [],
    });

    await waitForCondition(
      () => parseJobRepository.findById(parseJob.id)?.status === "needs_review",
    );

    const completedJob = parseJobRepository.findById(parseJob.id);

    expect(completedJob?.status).toBe("needs_review");
    expect(completedJob?.attemptCount).toBe(2);
    expect(completedJob?.resultJson?.questions).toHaveLength(1);
    expect(sourceDocumentRepository.findById(sourceDocument.id)?.parseStatus).toBe(
      "needs_review",
    );
  });
});
