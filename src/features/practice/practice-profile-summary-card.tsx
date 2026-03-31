"use client";

import type { PracticeProfile, PracticeProfileDimension } from "@/lib/schemas/practice";
import { SurfaceCard } from "@/components/ui/surface-card";
import { SectionHeading } from "@/components/workbench/section-heading";

type PracticeProfileSummaryCardProps = {
  profile: PracticeProfile;
  dimensions: PracticeProfileDimension[];
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "尚未建立画像";
  }

  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

export function PracticeProfileSummaryCard({
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
          最近评估：{formatDateTime(profile.last_assessed_at)}
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
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
