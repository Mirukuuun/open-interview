import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

import { isAssessmentResultSummaryV2 } from "../src/lib/schemas/practice";

type TestContext = {
  tempDir: string;
  sqlite: InstanceType<typeof import("better-sqlite3").default>;
  practiceService: typeof import("../src/server/services/practice-service").practiceService;
  questionRepository: typeof import("../src/server/repositories").questionRepository;
  openClawLlmClient: typeof import("../src/server/adapters/openclaw/llm-client").openClawLlmClient;
};

const globalForDatabase = globalThis as {
  openInterviewSqlite?: {
    close: () => void;
  };
};

let currentContext: TestContext | null = null;

async function createTestContext() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "open-interview-practice-"));
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
    { practiceService },
    { questionRepository },
    { openClawLlmClient },
  ] = await Promise.all([
    import("../src/server/db/client"),
    import("../src/server/services/practice-service"),
    import("../src/server/repositories"),
    import("../src/server/adapters/openclaw/llm-client"),
  ]);

  currentContext = {
    tempDir,
    sqlite,
    practiceService,
    questionRepository,
    openClawLlmClient,
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
  vi.restoreAllMocks();
  vi.resetModules();
});

async function seedQuestions(
  questionRepository: TestContext["questionRepository"],
  count = 10,
) {
  for (let index = 0; index < count; index += 1) {
    const question = questionRepository.create({
      questionText: `缓存击穿和缓存雪崩有什么区别？#${index + 1}`,
      canonicalAnswer: `需要先区分问题边界，再分别说明高并发、过期策略和降级兜底。#${index + 1}`,
      category:
        index % 4 === 0
          ? "distributed_system"
          : index % 4 === 1
            ? "database"
            : index % 4 === 2
              ? "java_concurrency"
              : null,
      difficulty: index % 3 === 0 ? "hard" : "medium",
      reviewStatus: "active",
      createdFrom: "manual",
    });

    if (index % 4 === 3) {
      questionRepository.replaceTags(question.id, ["network", "design"]);
    }
  }
}

describe("practice service", () => {
  it("creates a 10-question exam with unique question ids", async () => {
    const { practiceService, questionRepository } = await createTestContext();

    await seedQuestions(questionRepository, 12);

    const result = practiceService.createExamSession({
      questionCount: 10,
    });

    expect(result.assessment_session.question_count).toBe(10);
    expect(result.items).toHaveLength(10);
    expect(new Set(result.items.map((item) => item.question_item_id)).size).toBe(10);
    expect(
      result.items.every(
        (item) =>
          item.dimension_weights.length > 0 &&
          Number(
            item.dimension_weights
              .reduce((sum, weight) => sum + weight.weight, 0)
              .toFixed(4),
          ) === 1,
      ),
    ).toBe(true);
  });

  it("returns a default practice profile before any exam is completed", async () => {
    const { practiceService } = await createTestContext();

    const result = practiceService.getPracticeProfile();

    expect(result.profile.id).toBe("practice_profile_local");
    expect(result.profile.scope).toBe("local_default");
    expect(result.dimensions).toHaveLength(6);
    expect(result.dimensions.every((dimension) => dimension.score === 0)).toBe(true);
    expect(
      result.dimensions.every((dimension) => dimension.evidence_count === 0),
    ).toBe(true);
  });

  it("falls back to deterministic scoring when the LLM provider is unavailable", async () => {
    const { practiceService, questionRepository, openClawLlmClient } =
      await createTestContext();

    await seedQuestions(questionRepository, 10);
    vi.spyOn(openClawLlmClient, "createJsonObject").mockRejectedValue(
      new Error("provider unavailable"),
    );

    const createdExam = practiceService.createExamSession({
      questionCount: 10,
    });
    const result = await practiceService.submitExamSession(
      createdExam.assessment_session.id,
      {
        answers: createdExam.items.map((item, index) => ({
          assessment_item_id: item.id,
          user_answer:
            index < 5
              ? "先给结论，再说明高并发、过期和兜底。"
              : "",
        })),
      },
    );

    expect(result.assessment_session.status).toBe("completed");
    expect(result.result_summary).not.toBeNull();
    expect(isAssessmentResultSummaryV2(result.result_summary)).toBe(true);

    if (!isAssessmentResultSummaryV2(result.result_summary)) {
      throw new Error("Expected practice exam result summary to be V2.");
    }

    expect(result.result_summary.weak_areas.length).toBeGreaterThan(0);
    expect(result.items.some((item) => item.score === 0)).toBe(true);
    expect(
      result.items.every((item) => item.feedback?.improvement_advice),
    ).toBe(true);
    expect(result.result_summary.exam_radar_dimensions.length).toBeGreaterThan(0);
    expect(result.result_summary.profile_radar_dimensions).toHaveLength(6);
    expect(result.result_summary.profile_updates.length).toBeGreaterThan(0);

    const profile = practiceService.getPracticeProfile();

    expect(profile.profile.last_exam_session_id).toBe(createdExam.assessment_session.id);
    expect(profile.profile.last_assessed_at).not.toBeNull();
    expect(
      profile.dimensions.some((dimension) => dimension.evidence_count > 0),
    ).toBe(true);
    expect(
      profile.dimensions.some((dimension) => dimension.last_exam_score !== null),
    ).toBe(true);
  });
});
