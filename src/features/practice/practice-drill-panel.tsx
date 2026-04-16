import { Target } from "lucide-react";

import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import type { PracticeQuestion } from "@/lib/schemas/practice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { EmptyList } from "@/components/workbench/empty-list";
import { SectionHeading } from "@/components/workbench/section-heading";

import { PracticeQuestionMeta } from "./practice-question-meta";
import type { DrillState } from "./practice-workbench-state";

type PracticeDrillPanelProps = {
  activeDimension: {
    key: PracticeDimensionKey;
    label: string;
  } | null;
  answerReadyCount: number;
  drillState: DrillState | null;
  practicePool: PracticeQuestion[];
  onNextQuestion: () => void;
  onReset: () => void;
  onRestart: () => void;
  onRevealAnswer: () => void;
  onStart: () => void;
};

function DrillStartState({
  answerReadyCount,
  practicePool,
  onStart,
}: Pick<PracticeDrillPanelProps, "answerReadyCount" | "practicePool" | "onStart">) {
  return (
    <SurfaceCard className="space-y-5">
      <SectionHeading title="开始随机练习" />
      <div className="flex flex-wrap gap-2">
        <Badge tone="accent">题池 {practicePool.length}</Badge>
        <Badge tone="success">可评分 {answerReadyCount}</Badge>
        <Badge>单轮不重复</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onStart} variant="primary">
          开始练习
        </Button>
        <Button href="/questions">查看题库</Button>
      </div>
    </SurfaceCard>
  );
}

function DrillCompletedState({
  onReset,
  onStart,
}: Pick<PracticeDrillPanelProps, "onReset" | "onStart">) {
  return (
    <SurfaceCard className="space-y-4">
      <SectionHeading title="本轮完成" />
      <div className="flex flex-wrap gap-3">
        <Button onClick={onStart} variant="primary">
          重新开始
        </Button>
        <Button onClick={onReset}>返回起点</Button>
      </div>
    </SurfaceCard>
  );
}

function DrillQuestionState({
  currentQuestion,
  drillState,
  onNextQuestion,
  onRestart,
  onRevealAnswer,
}: {
  currentQuestion: PracticeQuestion;
  drillState: DrillState;
  onNextQuestion: () => void;
  onRestart: () => void;
  onRevealAnswer: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-muted-foreground)]">
              练习进度
            </p>
            <p className="mt-1.5 text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-foreground)]">
              第 {drillState.currentIndex + 1} / {drillState.queue.length} 题
            </p>
          </div>
          <Badge tone="accent">
            {drillState.revealed ? "已揭晓答案" : "正在作答"}
          </Badge>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-[color:var(--color-brand)]"
            style={{
              width: `${((drillState.currentIndex + 1) / drillState.queue.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <SurfaceCard className="space-y-5">
        <SectionHeading title="当前题目" />
        <PracticeQuestionMeta
          category={currentQuestion.category}
          difficulty={currentQuestion.difficulty}
          tags={currentQuestion.tags}
        />
        <p className="text-lg font-semibold leading-8 text-[color:var(--color-foreground)]">
          {currentQuestion.question_text}
        </p>
        {drillState.revealed ? (
          <SurfaceCard className="space-y-3" muted>
            <SectionHeading title="参考答案" />
            <p className="whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-foreground)]">
              {currentQuestion.canonical_answer ?? "这道题暂时还没有整理好的标准答案。"}
            </p>
          </SurfaceCard>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {!drillState.revealed ? (
            <Button onClick={onRevealAnswer} variant="primary">
              查看答案
            </Button>
          ) : (
            <Button onClick={onNextQuestion} variant="primary">
              下一题
            </Button>
          )}
          <Button onClick={onRestart}>重新洗牌</Button>
        </div>
      </SurfaceCard>
    </div>
  );
}

export function PracticeDrillPanel({
  activeDimension,
  answerReadyCount,
  drillState,
  practicePool,
  onNextQuestion,
  onReset,
  onRestart,
  onRevealAnswer,
  onStart,
}: PracticeDrillPanelProps) {
  if (practicePool.length === 0) {
    return (
      <EmptyList
        action={{ href: "/import", label: "先去补题库" }}
        bullets={
          activeDimension
            ? ["退出过滤回到全量随机练习", "补充并审核该维度相关题目"]
            : ["去导入页补充面经或知识点", "确认审核通过后题目会进入题库"]
        }
        description={
          activeDimension
            ? `当前还没有命中「${activeDimension.label}」的题目。`
            : "当前还没有可练习的题目。"
        }
        icon={Target}
        title={activeDimension ? "这个维度下还没有可练习题目" : "题库还是空的"}
      />
    );
  }

  if (!drillState) {
    return (
      <DrillStartState
        answerReadyCount={answerReadyCount}
        onStart={onStart}
        practicePool={practicePool}
      />
    );
  }

  const currentQuestion = drillState.queue[drillState.currentIndex];

  if (!currentQuestion) {
    return <DrillCompletedState onReset={onReset} onStart={onStart} />;
  }

  return (
    <DrillQuestionState
      currentQuestion={currentQuestion}
      drillState={drillState}
      onNextQuestion={onNextQuestion}
      onRestart={onRestart}
      onRevealAnswer={onRevealAnswer}
    />
  );
}
