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
              "rounded-[var(--radius-lg)] border bg-[color:var(--color-surface)] px-4 py-3.5 transition-colors",
              isActive
                ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)]/60"
                : "border-[color:var(--color-border)]",
            )}
            key={dimension.key}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  {dimension.label}
                </p>
                {!isCompact ? (
                  <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted-foreground)]">
                    {formatDimensionMeta(dimension)}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "font-semibold tracking-[-0.03em] text-[color:var(--color-foreground)]",
                    isCompact ? "text-base" : "text-lg",
                  )}
                >
                  {dimension.score.toFixed(1)}
                </p>
                {isActive ? (
                  <span className="mt-1 inline-flex rounded-full bg-[color:var(--color-surface)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-brand)]">
                    当前范围
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[color:var(--color-surface-subtle)]">
              <div
                className="h-full rounded-full bg-[color:var(--color-brand)]"
                style={{ width: `${Math.min(100, dimension.score * 10)}%` }}
              />
            </div>

            {showWeakestAction ? (
              <div className="mt-3 flex items-center justify-end">
                <Link
                  className="text-xs font-medium text-[color:var(--color-brand)] transition-colors hover:text-[color:var(--color-brand)]/80"
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
