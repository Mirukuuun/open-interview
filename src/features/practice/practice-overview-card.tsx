import Link from "next/link";

import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DetailGrid } from "@/components/workbench/detail-grid";
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
    <Card>
      <CardBody className={cn("space-y-5", density === "minimal" ? "space-y-4" : "space-y-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">题库训练</Badge>
              <Badge>{mode === "exam" ? "模拟考试" : "随机练习"}</Badge>
            </div>
            <h2 className="text-base font-semibold text-[color:var(--color-foreground)]">
              {getOverviewTitle(activeDimension)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => onModeChange("drill")}
              size="sm"
              variant={mode === "drill" ? "primary" : "secondary"}
            >
              随机练习
            </Button>
            <Button
              onClick={() => onModeChange("exam")}
              size="sm"
              variant={mode === "exam" ? "primary" : "secondary"}
            >
              模拟考试
            </Button>
          </div>
        </div>

        {activeDimension ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] px-3 py-2 text-sm text-[color:var(--color-foreground)]">
            <span className="font-medium">{activeDimension.label}</span>
            <span className="text-[color:var(--color-muted-foreground)]">题池已过滤</span>
            <Link
              className="ml-auto text-sm font-medium text-[color:var(--color-brand)] transition-colors hover:text-[color:var(--color-brand)]/80"
              href="/practice"
            >
              退出定向练习
            </Link>
          </div>
        ) : null}

        <DetailGrid items={stats} />

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[color:var(--color-foreground)]">长期能力画像</p>
              <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                最近评估{" "}
                {formatDateTimeLabel(profileState.profile.last_assessed_at, "尚未建立")}
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted-foreground)]">
              {profileState.profile.dimension_catalog_version}
            </p>
          </div>

          <PracticeProfileGrid
            activeDimensionKey={activeDimension?.key}
            density={compactProfileDensity}
            dimensions={profileState.dimensions}
          />
        </div>
      </CardBody>
    </Card>
  );
}
