"use client";

import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import type { PracticeProfile, PracticeProfileDimension } from "@/lib/schemas/practice";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/workbench/section-heading";
import { formatDateTimeLabel } from "@/lib/date-time";

type PracticeProfileSummaryCardProps = {
  activeDimensionKey?: PracticeDimensionKey | null;
  profile: PracticeProfile;
  dimensions: PracticeProfileDimension[];
};

export function PracticeProfileSummaryCard({
  activeDimensionKey,
  profile,
  dimensions,
}: PracticeProfileSummaryCardProps) {
  return (
    <SurfaceCard className="space-y-4">
      <SectionHeading
        description="长期能力画像会在每次完成考试后，只更新本场有覆盖证据的维度。"
        title="长期能力画像"
      />
      <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3">
        <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
          {profile.dimension_catalog_version}
        </p>
        <p className="mt-2 text-sm leading-6 text-text-strong">
          最近评估：{formatDateTimeLabel(profile.last_assessed_at, "尚未建立画像")}
        </p>
      </div>
      <div className="space-y-3">
        {dimensions.map((dimension) => (
          <div
            className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3"
            key={dimension.key}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text-strong">
                {dimension.label}
              </p>
              <p className="text-sm font-semibold text-text-strong">
                {dimension.score.toFixed(1)}
              </p>
            </div>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              证据值 {dimension.evidence_count.toFixed(2)}
              {dimension.last_exam_score === null ||
              dimension.last_exam_score === undefined
                ? ""
                : ` · 最近一场 ${dimension.last_exam_score.toFixed(1)}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                href={`/practice?dimension=${dimension.key}`}
                variant={activeDimensionKey === dimension.key ? "primary" : "secondary"}
              >
                {activeDimensionKey === dimension.key ? "当前定向维度" : "按此维度练习"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
