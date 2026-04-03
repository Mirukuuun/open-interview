import Link from "next/link";

import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import type { PracticeProfileDimension } from "@/lib/schemas/practice";
import { cn } from "@/lib/utils";

export type PracticeProfileGridDensity = "full" | "compact";

type PracticeProfileGridProps = {
  activeDimensionKey?: PracticeDimensionKey | null;
  density: PracticeProfileGridDensity;
  dimensions: PracticeProfileDimension[];
};

function getWeakestDimension(dimensions: PracticeProfileDimension[]) {
  return [...dimensions].sort((left, right) => left.score - right.score)[0] ?? null;
}

function formatDimensionMeta(dimension: PracticeProfileDimension) {
  if (dimension.last_exam_score === null || dimension.last_exam_score === undefined) {
    return `证据 ${dimension.evidence_count.toFixed(2)}`;
  }

  return `证据 ${dimension.evidence_count.toFixed(2)} · 最近 ${dimension.last_exam_score.toFixed(1)}`;
}

export function PracticeProfileGrid({
  activeDimensionKey,
  density,
  dimensions,
}: PracticeProfileGridProps) {
  const weakestDimension = getWeakestDimension(dimensions);
  const isCompact = density === "compact";

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {dimensions.map((dimension) => {
        const isActive = activeDimensionKey === dimension.key;
        const showWeakestAction =
          !isCompact &&
          weakestDimension?.key === dimension.key &&
          !isActive;

        return (
          <div
            className={cn(
              "rounded-[20px] border bg-white/82 px-4 py-3.5 transition-colors",
              isActive
                ? "border-accent bg-accent-soft/60"
                : "border-border-muted",
            )}
            key={dimension.key}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-strong">
                  {dimension.label}
                </p>
                {!isCompact ? (
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    {formatDimensionMeta(dimension)}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "font-semibold tracking-[-0.03em] text-text-strong",
                    isCompact ? "text-base" : "text-lg",
                  )}
                >
                  {dimension.score.toFixed(1)}
                </p>
                {isActive ? (
                  <span className="mt-1 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-medium text-accent">
                    当前范围
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--accent-soft)_55%,white)]">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, dimension.score * 10)}%` }}
              />
            </div>

            {showWeakestAction ? (
              <div className="mt-3 flex items-center justify-end">
                <Link
                  className="text-xs font-medium text-accent transition-colors hover:text-accent-secondary"
                  href={`/practice?dimension=${dimension.key}`}
                >
                  先练这个
                </Link>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
