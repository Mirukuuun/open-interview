"use client";

/*
[POS] /practice 客户端状态编排入口，负责协调顶部总览、练习/考试主舞台和最近考试历史区。
[IN] 当前激活维度、练习题池、最近考试摘要、长期能力画像。
[OUT] 发起随机练习、创建/提交模拟考试，并将结果回流到当前页面状态。
@feature open-interview-practice-feature.md
@AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
*/

import { useState } from "react";

import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import type {
  CreateAssessmentSessionResponseData,
  PracticeProfile,
  PracticeProfileDimension,
  PracticeQuestion,
  PracticeRecentExam,
  SubmitAssessmentSessionResponseData,
} from "@/lib/schemas/practice";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workbench/page-header";

import { PracticeDrillPanel } from "./practice-drill-panel";
import { PracticeExamPanel } from "./practice-exam-panel";
import { PracticeOverviewCard } from "./practice-overview-card";
import { PracticeRecentExamsPanel } from "./practice-recent-exams-panel";
import {
  buildExamState,
  shuffleArray,
  type DrillState,
  type ExamState,
  type PracticeMode,
} from "./practice-workbench-state";
import {
  buildProfileStateFromExamResult,
  type PracticeProfileState,
} from "./practice-view-model";

type PracticeWorkbenchClientProps = {
  activeDimension: {
    key: PracticeDimensionKey;
    label: string;
  } | null;
  practicePool: PracticeQuestion[];
  recentExams: PracticeRecentExam[];
  practiceProfile: {
    profile: PracticeProfile;
    dimensions: PracticeProfileDimension[];
  };
};

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!payload) {
    throw new Error("Response body is not valid JSON.");
  }

  if (!payload.ok) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}

function getOverviewDensity({
  drillState,
  examState,
}: {
  drillState: DrillState | null;
  examState: ExamState | null;
}) {
  if (examState && !examState.resultSummary) {
    return "minimal" as const;
  }

  if (drillState || examState?.resultSummary) {
    return "compact" as const;
  }

  return "full" as const;
}

export function PracticeWorkbenchClient({
  activeDimension,
  practicePool,
  recentExams,
  practiceProfile,
}: PracticeWorkbenchClientProps) {
  const [mode, setMode] = useState<PracticeMode>("drill");
  const [drillState, setDrillState] = useState<DrillState | null>(null);
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [profileState, setProfileState] = useState<PracticeProfileState>(
    practiceProfile,
  );
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  const answerReadyCount = practicePool.filter(
    (question) => Boolean(question.canonical_answer),
  ).length;
  const isExamTaking =
    mode === "exam" && examState !== null && examState.resultSummary === null;
  const overviewDensity = getOverviewDensity({ drillState, examState });

  function startDrill() {
    setMode("drill");
    setDrillState({
      queue: shuffleArray(practicePool),
      currentIndex: 0,
      revealed: false,
    });
  }

  function handleNextDrillQuestion() {
    setDrillState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        currentIndex: currentState.currentIndex + 1,
        revealed: false,
      };
    });
  }

  function handleRevealAnswer() {
    setDrillState((currentState) =>
      currentState ? { ...currentState, revealed: true } : currentState,
    );
  }

  async function handleCreateExam() {
    setIsCreatingExam(true);
    setExamError(null);

    try {
      const response = await fetch("/api/practice/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(activeDimension ? { dimension: activeDimension.key } : {}),
          question_count: 10,
        }),
      });
      const data = await readApiResponse<CreateAssessmentSessionResponseData>(response);

      setMode("exam");
      setExamState(buildExamState(data));
    } catch (error) {
      setExamError(error instanceof Error ? error.message : "创建考试失败。");
    } finally {
      setIsCreatingExam(false);
    }
  }

  function handleExamAnswerChange(itemId: string, value: string) {
    setExamState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        answers: {
          ...currentState.answers,
          [itemId]: value,
        },
      };
    });
  }

  async function handleSubmitExam() {
    if (!examState) {
      return;
    }

    setIsSubmittingExam(true);
    setExamError(null);

    try {
      const response = await fetch(
        `/api/practice/exams/${examState.sessionId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: examState.items.map((item) => ({
              assessment_item_id: item.id,
              user_answer: examState.answers[item.id] ?? "",
            })),
          }),
        },
      );
      const data = await readApiResponse<SubmitAssessmentSessionResponseData>(response);

      setExamState(buildExamState(data));
      setProfileState((currentState) =>
        buildProfileStateFromExamResult(data, currentState),
      );
    } catch (error) {
      setExamError(error instanceof Error ? error.message : "提交考试失败。");
    } finally {
      setIsSubmittingExam(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="训练"
        highlights={[
          { label: "题池", value: `${practicePool.length}` },
          { label: "可评分", value: `${answerReadyCount}` },
          { label: "最近考试", value: `${recentExams.length}` },
        ]}
        actions={
          <Button href="/practice/drill" size="lg" variant="primary">
            开始训练
          </Button>
        }
      />

      <PracticeOverviewCard
        activeDimension={activeDimension}
        answerReadyCount={answerReadyCount}
        density={overviewDensity}
        mode={mode}
        onModeChange={setMode}
        practicePoolCount={practicePool.length}
        profileState={profileState}
        recentExamCount={recentExams.length}
      />

      <div
        className={
          isExamTaking
            ? "grid gap-5"
            : "grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-start"
        }
      >
        <div id="practice-panel">
          {mode === "drill" ? (
            <PracticeDrillPanel
              activeDimension={activeDimension}
              answerReadyCount={answerReadyCount}
              drillState={drillState}
              onNextQuestion={handleNextDrillQuestion}
              onReset={() => setDrillState(null)}
              onRestart={startDrill}
              onRevealAnswer={handleRevealAnswer}
              onStart={startDrill}
              practicePool={practicePool}
            />
          ) : (
            <PracticeExamPanel
              activeDimension={activeDimension}
              answerReadyCount={answerReadyCount}
              examError={examError}
              examState={examState}
              isCreatingExam={isCreatingExam}
              isSubmittingExam={isSubmittingExam}
              onAnswerChange={handleExamAnswerChange}
              onCreateExam={handleCreateExam}
              onSubmitExam={handleSubmitExam}
            />
          )}
        </div>

        {!isExamTaking ? (
          <PracticeRecentExamsPanel
            activeDimensionKey={activeDimension?.key}
            recentExams={recentExams}
          />
        ) : null}
      </div>
    </div>
  );
}
