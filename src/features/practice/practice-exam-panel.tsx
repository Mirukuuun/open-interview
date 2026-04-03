import { LoaderCircle } from "lucide-react";

import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import type {
  AssessmentResultSummary,
  AssessmentResultSummaryV2,
  PracticeProfileUpdate,
} from "@/lib/schemas/practice";
import { isAssessmentResultSummaryV2 } from "@/lib/schemas/practice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyList } from "@/components/workbench/empty-list";
import { SectionHeading } from "@/components/workbench/section-heading";

import { PracticeProfileUpdates } from "./practice-profile-updates";
import { PracticeQuestionMeta } from "./practice-question-meta";
import {
  PracticeRadarChart,
  type PracticeRadarChartDimension,
} from "./practice-radar-chart";
import type { ExamState } from "./practice-workbench-state";
import {
  toExamRadarChartDimensions,
  toLegacyRadarChartDimensions,
  toProfileRadarChartDimensions,
} from "./practice-view-model";

type PracticeExamPanelProps = {
  activeDimension: {
    key: PracticeDimensionKey;
    label: string;
  } | null;
  answerReadyCount: number;
  examError: string | null;
  examState: ExamState | null;
  isCreatingExam: boolean;
  isSubmittingExam: boolean;
  onAnswerChange: (itemId: string, value: string) => void;
  onCreateExam: () => void;
  onSubmitExam: () => void;
};

function renderWeakAreaBadges(
  weakAreas: AssessmentResultSummaryV2["weak_areas"] | AssessmentResultSummary["weak_areas"],
) {
  return weakAreas.map((area) => (
    <Badge key={area.key} tone="warning">
      {area.label} {area.average_score.toFixed(1)}
    </Badge>
  ));
}

function ExamErrorNotice({ examError }: Pick<PracticeExamPanelProps, "examError">) {
  if (!examError) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning">
      {examError}
    </div>
  );
}

function ExamStartState({
  answerReadyCount,
  examError,
  isCreatingExam,
  onCreateExam,
}: Pick<
  PracticeExamPanelProps,
  "answerReadyCount" | "examError" | "isCreatingExam" | "onCreateExam"
>) {
  return (
    <SurfaceCard className="space-y-5">
      <SectionHeading title="开始模拟考试" />
      <div className="flex flex-wrap gap-2">
        <Badge tone="accent">固定 10 题</Badge>
        <Badge tone="success">AI 评分 + 兜底规则</Badge>
        <Badge>题源 {answerReadyCount}</Badge>
      </div>
      <ExamErrorNotice examError={examError} />
      <div className="flex flex-wrap gap-3">
        <Button disabled={isCreatingExam} onClick={onCreateExam} variant="primary">
          {isCreatingExam ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            "开始 10 题考试"
          )}
        </Button>
        <Button href="/questions">先看题库</Button>
      </div>
    </SurfaceCard>
  );
}

function ExamTakingProgress({
  answeredCount,
  isSubmittingExam,
  totalCount,
}: {
  answeredCount: number;
  isSubmittingExam: boolean;
  totalCount: number;
}) {
  return (
    <div className="rounded-[22px] border border-border-strong bg-[linear-gradient(180deg,rgba(244,242,249,0.94)_0%,rgba(255,255,255,0.98)_100%)] px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
            模拟考试
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-[-0.04em] text-text-strong">
            {answeredCount} / {totalCount} 题已作答
          </p>
        </div>
        <Badge tone={isSubmittingExam ? "warning" : "accent"}>
          {isSubmittingExam ? "评分中" : "作答中"}
        </Badge>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${(answeredCount / totalCount) * 100}%` }}
        />
      </div>
    </div>
  );
}

function ExamSubmittingState() {
  return (
    <SurfaceCard className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-text-strong">
        <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
        正在评分并生成维度摘要
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
      </div>
    </SurfaceCard>
  );
}

function ExamTakingState({
  examError,
  examState,
  isCreatingExam,
  isSubmittingExam,
  onAnswerChange,
  onCreateExam,
  onSubmitExam,
}: Pick<
  PracticeExamPanelProps,
  "examError" | "examState" | "isCreatingExam" | "isSubmittingExam" | "onAnswerChange" | "onCreateExam" | "onSubmitExam"
> & { examState: ExamState }) {
  const answeredCount = Object.values(examState.answers).filter(
    (answer) => answer.trim().length > 0,
  ).length;

  return (
    <div className="space-y-5">
      <ExamTakingProgress
        answeredCount={answeredCount}
        isSubmittingExam={isSubmittingExam}
        totalCount={examState.items.length}
      />
      {isSubmittingExam ? <ExamSubmittingState /> : null}
      <ExamErrorNotice examError={examError} />
      <SurfaceCard className="space-y-5">
        <SectionHeading title="考试作答" />
        <div className="space-y-4">
          {examState.items.map((item) => (
            <SurfaceCard className="space-y-3" key={item.id} muted>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeading title={`第 ${item.sequence_no} 题`} />
                <PracticeQuestionMeta
                  category={item.category}
                  difficulty={item.difficulty}
                  tags={item.tags}
                />
              </div>
              <p className="text-base font-semibold leading-7 text-text-strong">
                {item.question_text}
              </p>
              <Textarea
                disabled={isSubmittingExam}
                onChange={(event) => onAnswerChange(item.id, event.target.value)}
                placeholder="写下你的回答。"
                value={examState.answers[item.id] ?? ""}
              />
            </SurfaceCard>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={isSubmittingExam}
            onClick={onSubmitExam}
            variant="primary"
          >
            {isSubmittingExam ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                评分中...
              </>
            ) : (
              "提交并评分"
            )}
          </Button>
          <Button disabled={isCreatingExam} onClick={onCreateExam}>
            换一套题
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}

function buildResultData(resultSummary: AssessmentResultSummary) {
  const resultSummaryV2 = isAssessmentResultSummaryV2(resultSummary)
    ? resultSummary
    : null;
  const examRadarDimensions: PracticeRadarChartDimension[] = resultSummaryV2
    ? toExamRadarChartDimensions(resultSummaryV2)
    : toLegacyRadarChartDimensions(resultSummary);
  const profileRadarDimensions: PracticeRadarChartDimension[] = resultSummaryV2
    ? toProfileRadarChartDimensions(resultSummaryV2)
    : [];
  const profileUpdates: PracticeProfileUpdate[] = resultSummaryV2
    ? resultSummaryV2.profile_updates
    : [];

  return {
    examRadarDimensions,
    profileRadarDimensions,
    profileUpdates,
    resultSummaryV2,
  };
}

function ExamResultState({
  examState,
  isCreatingExam,
  onCreateExam,
}: Pick<PracticeExamPanelProps, "isCreatingExam" | "onCreateExam"> & {
  examState: ExamState;
}) {
  const { resultSummary } = examState;

  if (!resultSummary) {
    return null;
  }

  const {
    examRadarDimensions,
    profileRadarDimensions,
    profileUpdates,
    resultSummaryV2,
  } = buildResultData(resultSummary);

  return (
    <div className="space-y-5">
      <SurfaceCard className="space-y-4 bg-[linear-gradient(180deg,rgba(244,242,249,0.94)_0%,rgba(255,255,255,0.98)_100%)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
              考试结果
            </p>
            <p className="mt-1.5 text-[2rem] font-semibold tracking-[-0.05em] text-text-strong">
              {examState.totalScore === null
                ? "评分失败"
                : `${examState.totalScore}/${examState.maxScore}`}
            </p>
          </div>
          <div className="rounded-[18px] border border-border-muted bg-white/82 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
              平均分
            </p>
            <p className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-text-strong">
              {examState.totalScore === null
                ? "-"
                : `${(examState.totalScore / examState.items.length).toFixed(1)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {renderWeakAreaBadges(resultSummary.weak_areas)}
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-4">
        <SectionHeading title="整体反馈" />
        <p className="whitespace-pre-wrap text-sm leading-7 text-text-strong">
          {resultSummary.overall_feedback}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={isCreatingExam} onClick={onCreateExam} variant="primary">
            {isCreatingExam ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              "再来一套"
            )}
          </Button>
        </div>
      </SurfaceCard>

      <PracticeRadarChart dimensions={examRadarDimensions} title="本次考试雷达" />

      {resultSummaryV2 ? (
        <>
          <PracticeRadarChart
            dimensions={profileRadarDimensions}
            highlightedKeys={profileUpdates.map((update) => update.key)}
            title="长期能力画像"
          />
          <PracticeProfileUpdates updates={profileUpdates} />
        </>
      ) : null}

      <div className="space-y-4">
        <SectionHeading title="逐题反馈" />
        {examState.items.map((item) => (
          <SurfaceCard className="space-y-4" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-text-strong">
                  第 {item.sequence_no} 题
                </p>
                <PracticeQuestionMeta
                  category={item.category}
                  difficulty={item.difficulty}
                  tags={item.tags}
                />
              </div>
              <Badge tone="accent">
                {item.score ?? 0}/{item.max_score}
              </Badge>
            </div>
            <p className="text-base font-semibold leading-7 text-text-strong">
              {item.question_text}
            </p>
            <SurfaceCard className="space-y-3" muted>
              <SectionHeading title="你的回答" />
              <p className="whitespace-pre-wrap text-sm leading-7 text-text-strong">
                {item.user_answer?.trim() || "未作答"}
              </p>
            </SurfaceCard>
            <SurfaceCard className="space-y-3" muted>
              <SectionHeading title="标准答案" />
              <p className="whitespace-pre-wrap text-sm leading-7 text-text-strong">
                {item.canonical_answer ?? "暂无标准答案"}
              </p>
            </SurfaceCard>
            {item.feedback ? (
              <div className="grid gap-4 xl:grid-cols-3">
                <SurfaceCard className="space-y-3" muted>
                  <SectionHeading title="做得好的点" />
                  <ul className="space-y-2 text-sm leading-6 text-text-strong">
                    {item.feedback.strengths.map((strength) => (
                      <li key={strength}>{strength}</li>
                    ))}
                  </ul>
                </SurfaceCard>
                <SurfaceCard className="space-y-3" muted>
                  <SectionHeading title="缺失要点" />
                  <ul className="space-y-2 text-sm leading-6 text-text-strong">
                    {item.feedback.missed_points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </SurfaceCard>
                <SurfaceCard className="space-y-3" muted>
                  <SectionHeading title="下一步建议" />
                  <p className="text-sm leading-6 text-text-strong">
                    {item.feedback.improvement_advice}
                  </p>
                  {item.skill_scores ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge>准确性 {item.skill_scores.accuracy}</Badge>
                      <Badge>覆盖度 {item.skill_scores.coverage}</Badge>
                      <Badge>表达 {item.skill_scores.clarity}</Badge>
                    </div>
                  ) : null}
                </SurfaceCard>
              </div>
            ) : null}
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}

export function PracticeExamPanel({
  activeDimension,
  answerReadyCount,
  examError,
  examState,
  isCreatingExam,
  isSubmittingExam,
  onAnswerChange,
  onCreateExam,
  onSubmitExam,
}: PracticeExamPanelProps) {
  if (answerReadyCount < 10) {
    return (
      <EmptyList
        bullets={[
          `当前带标准答案题目数：${answerReadyCount}`,
          activeDimension ? "退出过滤或继续补充该维度答案" : "先补充更多题库答案",
        ]}
        description={
          activeDimension
            ? `当前命中「${activeDimension.label}」且带标准答案的题目不足 10 道。`
            : "当前带标准答案的题目不足 10 道。"
        }
        title="可评分题目不足 10 道"
      />
    );
  }

  if (!examState) {
    return (
      <ExamStartState
        answerReadyCount={answerReadyCount}
        examError={examError}
        isCreatingExam={isCreatingExam}
        onCreateExam={onCreateExam}
      />
    );
  }

  if (examState.resultSummary) {
    return (
      <ExamResultState
        examState={examState}
        isCreatingExam={isCreatingExam}
        onCreateExam={onCreateExam}
      />
    );
  }

  return (
    <ExamTakingState
      examError={examError}
      examState={examState}
      isCreatingExam={isCreatingExam}
      isSubmittingExam={isSubmittingExam}
      onAnswerChange={onAnswerChange}
      onCreateExam={onCreateExam}
      onSubmitExam={onSubmitExam}
    />
  );
}
