"use client";

import { useState } from "react";

import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import type {
  AssessmentItem,
  AssessmentResultSummary,
  AssessmentResultSummaryV2,
  CreateAssessmentSessionResponseData,
  PracticeProfile,
  PracticeProfileDimension,
  PracticeQuestion,
  PracticeRecentExam,
  PracticeProfileUpdate,
  SubmitAssessmentSessionResponseData,
} from "@/lib/schemas/practice";
import { isAssessmentResultSummaryV2 } from "@/lib/schemas/practice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Textarea } from "@/components/ui/textarea";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import {
  formatCategoryLabelOrFallback,
  formatTagLabel,
} from "@/lib/taxonomy-display";

import { PracticeProfileSummaryCard } from "./practice-profile-summary-card";
import { PracticeRecentExamCard } from "./practice-recent-exam-card";
import { PracticeProfileUpdates } from "./practice-profile-updates";
import {
  PracticeRadarChart,
  type PracticeRadarChartDimension,
} from "./practice-radar-chart";
import {
  buildProfileStateFromExamResult,
  toExamRadarChartDimensions,
  toLegacyRadarChartDimensions,
  toProfileRadarChartDimensions,
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

type PracticeMode = "drill" | "exam";

type DrillState = {
  queue: PracticeQuestion[];
  currentIndex: number;
  revealed: boolean;
};

type ExamState = {
  sessionId: string;
  items: AssessmentItem[];
  answers: Record<string, string>;
  resultSummary: AssessmentResultSummary | null;
  totalScore: number | null;
  maxScore: number;
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

function shuffleArray<T>(items: T[]) {
  const copiedItems = [...items];

  for (let index = copiedItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = copiedItems[index];

    copiedItems[index] = copiedItems[randomIndex] as T;
    copiedItems[randomIndex] = currentValue as T;
  }

  return copiedItems;
}

function buildExamState(
  payload: CreateAssessmentSessionResponseData | SubmitAssessmentSessionResponseData,
): ExamState {
  return {
    sessionId: payload.assessment_session.id,
    items: payload.items,
    answers: Object.fromEntries(
      payload.items.map((item) => [item.id, item.user_answer ?? ""]),
    ),
    resultSummary:
      "result_summary" in payload ? payload.result_summary ?? null : null,
    totalScore: payload.assessment_session.total_score ?? null,
    maxScore: payload.assessment_session.max_score,
  };
}

function renderWeakAreaBadges(
  weakAreas: AssessmentResultSummaryV2["weak_areas"] | AssessmentResultSummary["weak_areas"],
) {
  return weakAreas.map((area) => (
    <Badge key={area.key} tone="warning">
      {area.label} {area.average_score.toFixed(1)}
    </Badge>
  ));
}

function renderQuestionMeta(question: {
  category?: string | null;
  difficulty?: string | null;
  tags: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone="accent">
        {formatCategoryLabelOrFallback(question.category, "未分类")}
      </Badge>
      {question.difficulty ? <Badge>{question.difficulty}</Badge> : null}
      {question.tags.slice(0, 3).map((tag) => (
        <Badge key={tag}>{formatTagLabel(tag) ?? tag}</Badge>
      ))}
    </div>
  );
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
  const currentDrillQuestion = drillState?.queue[drillState.currentIndex];

  function startDrill() {
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

  function renderDrillPanel() {
    if (practicePool.length === 0) {
      return (
        <EmptyList
          title={activeDimension ? "这个维度下还没有可练习题目" : "题库还是空的"}
          description={
            activeDimension
              ? `当前还没有命中「${activeDimension.label}」的题目。可以退出过滤，或继续补充该维度相关题库。`
              : "当前还没有可练习的题目。先去导入资料或手工录题，再回来开始随机练习。"
          }
          bullets={
            activeDimension
              ? ["退出过滤回到全量随机练习", "补充并审核该维度相关题目"]
              : ["去导入页补充面经或知识点", "确认审核通过后题目会进入题库"]
          }
        />
      );
    }

    if (!drillState) {
      return (
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="每轮会把当前题库完整洗牌一次；单轮内题目不重复，刷新页面则视为新一轮。"
            title="开始随机练习"
          />
          <DetailGrid
            items={[
              { label: "题库总量", value: `${practicePool.length}` },
              { label: "可评分题", value: `${answerReadyCount}` },
              { label: "模式", value: "先看题，再手动查看答案" },
              { label: "重复规则", value: "单轮不重复" },
            ]}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={startDrill} variant="primary">
              开始练习
            </Button>
            <Button href="/questions">查看题库</Button>
          </div>
        </SurfaceCard>
      );
    }

    if (!currentDrillQuestion) {
      return (
        <SurfaceCard className="space-y-4">
          <SectionHeading
            description="这一轮题目已经全部刷完。可以立即重新洗牌再来一轮。"
            title="本轮完成"
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={startDrill} variant="primary">
              重新开始
            </Button>
            <Button onClick={() => setDrillState(null)}>返回起点</Button>
          </div>
        </SurfaceCard>
      );
    }

    return (
      <div className="space-y-5">
        <DetailGrid
          items={[
            { label: "进度", value: `${drillState.currentIndex + 1}/${drillState.queue.length}` },
            { label: "模式", value: drillState.revealed ? "已揭晓答案" : "正在作答" },
            {
              label: "分类",
              value: formatCategoryLabelOrFallback(currentDrillQuestion.category),
            },
            {
              label: "答案状态",
              value: currentDrillQuestion.canonical_answer ? "可查看" : "暂缺标准答案",
            },
          ]}
        />

        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="先自己回答，再点击“查看答案”。"
            title="当前题目"
          />
          {renderQuestionMeta(currentDrillQuestion)}
          <p className="text-lg font-semibold leading-8 text-text-strong">
            {currentDrillQuestion.question_text}
          </p>
          {drillState.revealed ? (
            <SurfaceCard muted className="space-y-3">
              <SectionHeading title="参考答案" />
              <p className="whitespace-pre-wrap text-sm leading-7 text-text-strong">
                {currentDrillQuestion.canonical_answer ?? "这道题暂时还没有整理好的标准答案。"}
              </p>
            </SurfaceCard>
          ) : (
            <SurfaceCard muted>
              <p className="text-sm leading-6 text-text-muted">
                现在只展示题目本身。你可以先口头回答，或者在纸上记下自己的答题框架。
              </p>
            </SurfaceCard>
          )}
          <div className="flex flex-wrap gap-3">
            {!drillState.revealed ? (
              <Button
                onClick={() =>
                  setDrillState((currentState) =>
                    currentState ? { ...currentState, revealed: true } : currentState,
                  )
                }
                variant="primary"
              >
                查看答案
              </Button>
            ) : (
              <Button onClick={handleNextDrillQuestion} variant="primary">
                下一题
              </Button>
            )}
            <Button onClick={startDrill}>重新洗牌</Button>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  function renderExamPanel() {
    if (answerReadyCount < 10) {
      return (
        <EmptyList
          title="可评分题目不足 10 道"
          description={
            activeDimension
              ? `定向考试只会抽取命中「${activeDimension.label}」且带标准答案的题目。当前数量还不够 10 道，暂时无法开始考试。`
              : "模拟考试只会抽取带标准答案的题目。当前题库的标准答案数量还不够 10 道，暂时无法开始考试。"
          }
          bullets={[
            `当前带标准答案题目数：${answerReadyCount}`,
            activeDimension
              ? "退出过滤或继续补充该维度答案，再回来进行整套考试"
              : "先补充更多题库答案，再回来进行整套考试",
          ]}
        />
      );
    }

    if (!examState) {
      return (
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="每次固定抽取 10 道不重复题目。提交后系统会给出总分、薄弱项、本次考试雷达和长期能力画像。"
            title="开始模拟考试"
          />
          <DetailGrid
            items={[
              { label: "抽题数量", value: "10 题" },
              { label: "评分方式", value: "AI 主导 + 兜底规则" },
              { label: "数据来源", value: `${answerReadyCount} 道带标准答案题` },
              { label: "输出", value: "总分 / 双雷达 / 薄弱项" },
            ]}
          />
          {examError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning">
              {examError}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isCreatingExam}
              onClick={handleCreateExam}
              variant="primary"
            >
              {isCreatingExam ? "生成中..." : "开始 10 题考试"}
            </Button>
            <Button href="/questions">先看题库</Button>
          </div>
        </SurfaceCard>
      );
    }

    if (examState.resultSummary) {
      const resultSummary = examState.resultSummary;
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

      return (
        <div className="space-y-5">
          <DetailGrid
            items={[
              {
                label: "总分",
                value:
                  examState.totalScore === null
                    ? "评分失败"
                    : `${examState.totalScore}/${examState.maxScore}`,
              },
              {
                label: "平均分",
                value:
                  examState.totalScore === null
                    ? "-"
                    : `${(examState.totalScore / examState.items.length).toFixed(1)}`,
              },
              {
                label: "薄弱项",
                value: `${examState.resultSummary.weak_areas.length}`,
              },
              { label: "题量", value: `${examState.items.length}` },
            ]}
          />

          <SurfaceCard className="space-y-4">
            <SectionHeading title="整体反馈" />
            <p className="whitespace-pre-wrap text-sm leading-7 text-text-strong">
              {resultSummary.overall_feedback}
            </p>
            <div className="flex flex-wrap gap-2">
              {renderWeakAreaBadges(resultSummary.weak_areas)}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={isCreatingExam}
                onClick={handleCreateExam}
                variant="primary"
              >
                {isCreatingExam ? "生成中..." : "再来一套"}
              </Button>
            </div>
          </SurfaceCard>

          <PracticeRadarChart
            description={
              resultSummaryV2
                ? "只显示当前试卷实际覆盖到的固定维度，便于你判断这一套题主要暴露了哪些短板。"
                : "旧考试记录沿用历史雷达口径，仅用于回看当时的维度分布。"
            }
            dimensions={examRadarDimensions}
            title="本次考试雷达"
          />

          {resultSummaryV2 ? (
            <>
              <PracticeRadarChart
                description="长期能力画像始终展示固定 6 维，本场被更新的维度会高亮显示。"
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
                    {renderQuestionMeta(item)}
                  </div>
                  <Badge tone="accent">
                    {item.score ?? 0}/{item.max_score}
                  </Badge>
                </div>
                <p className="text-base font-semibold leading-7 text-text-strong">
                  {item.question_text}
                </p>
                <SurfaceCard muted className="space-y-3">
                  <SectionHeading title="你的回答" />
                  <p className="whitespace-pre-wrap text-sm leading-7 text-text-strong">
                    {item.user_answer?.trim() || "未作答"}
                  </p>
                </SurfaceCard>
                <SurfaceCard muted className="space-y-3">
                  <SectionHeading title="标准答案" />
                  <p className="whitespace-pre-wrap text-sm leading-7 text-text-strong">
                    {item.canonical_answer ?? "暂无标准答案"}
                  </p>
                </SurfaceCard>
                {item.feedback ? (
                  <div className="grid gap-4 xl:grid-cols-3">
                    <SurfaceCard muted className="space-y-3">
                      <SectionHeading title="做得好的点" />
                      <ul className="space-y-2 text-sm leading-6 text-text-strong">
                        {item.feedback.strengths.map((strength) => (
                          <li key={strength}>{strength}</li>
                        ))}
                      </ul>
                    </SurfaceCard>
                    <SurfaceCard muted className="space-y-3">
                      <SectionHeading title="缺失要点" />
                      <ul className="space-y-2 text-sm leading-6 text-text-strong">
                        {item.feedback.missed_points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </SurfaceCard>
                    <SurfaceCard muted className="space-y-3">
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

    return (
      <div className="space-y-5">
        <DetailGrid
          items={[
            { label: "考试题量", value: `${examState.items.length}` },
            { label: "回答进度", value: "提交后统一评分" },
            { label: "模式", value: isSubmittingExam ? "评分中" : "作答中" },
            { label: "会话", value: examState.sessionId.slice(0, 12) },
          ]}
        />
        {examError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning">
            {examError}
          </div>
        ) : null}
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="建议每题写 4 到 8 句，把结论、关键原理、风险点和落地经验讲清楚。"
            title="考试作答"
          />
          <div className="space-y-4">
            {examState.items.map((item) => (
              <SurfaceCard className="space-y-3" key={item.id} muted>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <SectionHeading title={`第 ${item.sequence_no} 题`} />
                  {renderQuestionMeta(item)}
                </div>
                <p className="text-base font-semibold leading-7 text-text-strong">
                  {item.question_text}
                </p>
                <Textarea
                  disabled={isSubmittingExam}
                  onChange={(event) =>
                    setExamState((currentState) =>
                      currentState
                        ? {
                            ...currentState,
                            answers: {
                              ...currentState.answers,
                              [item.id]: event.target.value,
                            },
                          }
                        : currentState,
                    )
                  }
                  placeholder="写下你的回答。留空也可以提交，但会被视为未作答。"
                  value={examState.answers[item.id] ?? ""}
                />
              </SurfaceCard>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isSubmittingExam}
              onClick={handleSubmitExam}
              variant="primary"
            >
              {isSubmittingExam ? "评分中..." : "提交并评分"}
            </Button>
            <Button disabled={isCreatingExam} onClick={handleCreateExam}>
              换一套题
            </Button>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              onClick={() => setMode("drill")}
              variant={mode === "drill" ? "primary" : "secondary"}
            >
              随机练习
            </Button>
            <Button
              onClick={() => setMode("exam")}
              variant={mode === "exam" ? "primary" : "secondary"}
            >
              模拟考试
            </Button>
          </>
        }
        eyebrow="题库训练"
        description={
          activeDimension
            ? `当前按「${activeDimension.label}」定向练习；随机练习和模拟考试都会只使用该维度映射到的题目。`
            : "一边做快速随机刷题，一边把带标准答案的题目组成 10 题考试，输出总分、薄弱项、本场雷达和长期能力画像。"
        }
        title={activeDimension ? "定向练习" : "随机练习"}
      />

      <DetailGrid
        items={[
          { label: "题库总量", value: `${practicePool.length}` },
          { label: "可评分题", value: `${answerReadyCount}` },
          { label: "最近考试", value: `${recentExams.length}` },
          {
            label: "训练范围",
            value: activeDimension ? activeDimension.label : "全量题库",
          },
          { label: "当前模式", value: mode === "drill" ? "随机练习" : "模拟考试" },
        ]}
      />

      {activeDimension ? (
        <SurfaceCard className="space-y-4">
          <SectionHeading
            description="退出过滤后会回到全量随机练习与全量考试抽题。"
            title={`当前定向维度：${activeDimension.label}`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="accent">题池已过滤</Badge>
            <Button href="/practice">退出定向练习</Button>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="左侧保留训练摘要、长期画像和最近成绩，右侧专注当前题目或考试流程。"
              title="模式说明"
            />
            <div className="space-y-3 text-sm leading-6 text-text-strong">
              <p>随机练习：适合碎片时间快速刷题，单轮不重复。</p>
              <p>模拟考试：固定抽取 10 题，提交后统一评分、识别薄弱项并增量更新长期画像。</p>
            </div>
          </SurfaceCard>

          <PracticeProfileSummaryCard
            activeDimensionKey={activeDimension?.key}
            dimensions={profileState.dimensions}
            profile={profileState.profile}
          />

          <SurfaceCard className="space-y-4">
            <SectionHeading title="最近考试" />
            {recentExams.length === 0 ? (
              <EmptyList
                title="还没有考试记录"
                description="开始第一套 10 题考试后，这里会显示最近结果和薄弱项摘要。"
              />
            ) : (
              <div className="space-y-3">
                {recentExams.map((exam) => (
                  <PracticeRecentExamCard
                    activeDimensionKey={activeDimension?.key}
                    exam={exam}
                    key={exam.id}
                  />
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div>{mode === "drill" ? renderDrillPanel() : renderExamPanel()}</div>
      </div>
    </div>
  );
}
