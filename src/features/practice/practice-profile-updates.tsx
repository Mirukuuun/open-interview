"use client";

import type { PracticeProfileUpdate } from "@/lib/schemas/practice";
import { SurfaceCard } from "@/components/ui/surface-card";
import { SectionHeading } from "@/components/workbench/section-heading";

type PracticeProfileUpdatesProps = {
  updates: PracticeProfileUpdate[];
};

export function PracticeProfileUpdates({ updates }: PracticeProfileUpdatesProps) {
  if (updates.length === 0) {
    return null;
  }

  return (
    <SurfaceCard className="space-y-4">
      <SectionHeading title="画像更新" />
      <div className="grid gap-3 lg:grid-cols-2">
        {updates.map((update) => (
          <SurfaceCard className="space-y-2" key={update.key} muted>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text-strong">
                {update.label}
              </p>
              <p className="text-sm font-semibold text-text-strong">
                {update.previous_score === null ||
                update.previous_score === undefined
                  ? `${update.new_score.toFixed(1)}`
                  : `${update.previous_score.toFixed(1)} -> ${update.new_score.toFixed(1)}`}
              </p>
            </div>
            <p className="text-xs leading-5 text-text-muted">
              本场维度分 {update.exam_score.toFixed(1)} · 覆盖权重{" "}
              {update.coverage_weight.toFixed(2)} · 更新强度{" "}
              {update.update_weight.toFixed(2)}
            </p>
          </SurfaceCard>
        ))}
      </div>
    </SurfaceCard>
  );
}
