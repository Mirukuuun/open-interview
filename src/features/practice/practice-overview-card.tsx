import Link from "next/link";

import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeLabel } from "@/lib/date-time";
import { cn } from "@/lib/utils";

import { type PracticeProfileState } from "./practice-view-model";
import { PracticeProfileGrid } from "./practice-profile-grid";
import type { PracticeMode } from "./practice-workbench-state";

export type PracticeOverviewDensity = "full" | "compact" | "minimal";

type PracticeOverviewCardProps = {
  activeDimension: {
    key: PracticeDimensionKey;
    label: string;
  } | null;
  answerReadyCount: number;
  density: PracticeOverviewDensity;
  mode: PracticeMode;
  practicePoolCount: number;
  profileState: PracticeProfileState;
  recentExamCount: number;
  onModeChange: (mode: PracticeMode) => void;
};

function getOverviewTitle(activeDimension: { key: PracticeDimensionKey; label: string } | null) {
  return activeDimension ? "定向练习" : "随机练习";
}

function buildOverviewStats({
  activeDimension,
  answerReadyCount,
  mode,
  practicePoolCount,
  recentExamCount,
}: Omit<PracticeOverviewCardProps, "density" | "onModeChange" | "profileState">) {
  return [
    { label: "题池", value: `${practicePoolCount}` },
    { label: "可评分", value: `${answerReadyCount}` },
    { label: "最近考试", value: `${recentExamCount}` },
    {
      label: "当前范围",
      value: activeDimension ? activeDimension.label : "全量题库",
      meta: mode === "exam" ? "模拟考试" : "随机练习",
    },
  ];
}

export function PracticeOverviewCard({
  activeDimension,
  answerReadyCount,
  density,
  mode,
  practicePoolCount,
  profileState,
  recentExamCount,
  onModeChange,
}: PracticeOverviewCardProps) {
  const stats = buildOverviewStats({
    activeDimension,
    answerReadyCount,
    mode,
    practicePoolCount,
    recentExamCount,
  });
  const compactProfileDensity = density === "full" ? "full" : "compact";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[26px] border border-border-strong bg-[linear-gradient(180deg,rgba(248,246,251,0.98)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-[padding,gap] duration-200 ease-out",
        density === "full" ? "p-6" : "p-5",
      )}
    >
      <div className={cn("space-y-5", density === "minimal" ? "space-y-4" : "space-y-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">题库训练</Badge>
              <Badge>{mode === "exam" ? "模拟考试" : "随机练习"}</Badge>
            </div>
            <h1 className="text-[1.7rem] font-semibold tracking-[-0.04em] text-text-strong">
              {getOverviewTitle(activeDimension)}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => onModeChange("drill")}
              variant={mode === "drill" ? "primary" : "secondary"}
            >
              随机练习
            </Button>
            <Button
              onClick={() => onModeChange("exam")}
              variant={mode === "exam" ? "primary" : "secondary"}
            >
              模拟考试
            </Button>
          </div>
        </div>

        {activeDimension ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-border-muted bg-white/82 px-3 py-2 text-sm text-text-strong">
            <span className="font-medium">{activeDimension.label}</span>
            <span className="text-text-muted">题池已过滤</span>
            <Link
              className="ml-auto text-sm font-medium text-accent transition-colors hover:text-accent-secondary"
              href="/practice"
            >
              退出定向练习
            </Link>
          </div>
        ) : null}

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              className="rounded-[18px] border border-border-muted bg-white/80 px-4 py-3"
              key={stat.label}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
                {stat.label}
              </p>
              <div className="mt-1.5 flex items-end justify-between gap-3">
                <p className="text-lg font-semibold tracking-[-0.03em] text-text-strong">
                  {stat.value}
                </p>
                {stat.meta ? (
                  <span className="text-xs text-text-muted">{stat.meta}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-strong">长期能力画像</p>
              <p className="mt-1 text-xs text-text-muted">
                最近评估{" "}
                {formatDateTimeLabel(profileState.profile.last_assessed_at, "尚未建立")}
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
              {profileState.profile.dimension_catalog_version}
            </p>
          </div>

          <PracticeProfileGrid
            activeDimensionKey={activeDimension?.key}
            density={compactProfileDensity}
            dimensions={profileState.dimensions}
          />
        </div>
      </div>
    </div>
  );
}
