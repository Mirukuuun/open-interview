import { useId } from "react";

import { SurfaceCard } from "@/components/ui/surface-card";

export type PracticeRadarChartDimension = {
  key: string;
  label: string;
  score: number;
  meta?: string;
};

type PracticeRadarChartProps = {
  title: string;
  description?: string;
  dimensions: PracticeRadarChartDimension[];
  highlightedKeys?: string[];
};

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function PracticeRadarChart({
  title,
  description,
  dimensions,
  highlightedKeys = [],
}: PracticeRadarChartProps) {
  const descriptionId = useId();

  if (dimensions.length === 0) {
    return (
      <SurfaceCard muted>
        <p className="text-sm text-text-muted">暂无足够维度可生成能力雷达图。</p>
      </SurfaceCard>
    );
  }

  const centerX = 160;
  const centerY = 160;
  const maxRadius = 108;
  const axisAngle = 360 / dimensions.length;
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const highlightedKeySet = new Set(highlightedKeys);
  const polygonPoints = dimensions
    .map((dimension, index) =>
      polarToCartesian(
        centerX,
        centerY,
        maxRadius * (dimension.score / 10),
        index * axisAngle,
      ),
    )
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <SurfaceCard className="space-y-4">
      <div className="space-y-1" id={descriptionId}>
        <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
        {description ? (
          <p className="text-sm leading-6 text-text-muted">{description}</p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <svg
          aria-label={title}
          aria-describedby={descriptionId}
          className="mx-auto h-[320px] w-[320px]"
          viewBox="0 0 320 320"
        >
          {gridLevels.map((level) => {
            const levelPoints = dimensions
              .map((_, index) =>
                polarToCartesian(centerX, centerY, maxRadius * level, index * axisAngle),
              )
              .map((point) => `${point.x},${point.y}`)
              .join(" ");

            return (
              <polygon
                fill="none"
                key={level}
                points={levelPoints}
                stroke="rgba(148, 163, 184, 0.45)"
                strokeWidth="1"
              />
            );
          })}

          {dimensions.map((dimension, index) => {
            const axisPoint = polarToCartesian(
              centerX,
              centerY,
              maxRadius,
              index * axisAngle,
            );
            const labelPoint = polarToCartesian(
              centerX,
              centerY,
              maxRadius + 34,
              index * axisAngle,
            );

            return (
              <g key={dimension.key}>
                <line
                  stroke="rgba(148, 163, 184, 0.45)"
                  strokeWidth="1"
                  x1={centerX}
                  x2={axisPoint.x}
                  y1={centerY}
                  y2={axisPoint.y}
                />
                <text
                  fill="currentColor"
                  fontSize="11"
                  textAnchor="middle"
                  x={labelPoint.x}
                  y={labelPoint.y}
                >
                  {dimension.label}
                </text>
                <text
                  fill="currentColor"
                  fontSize="10"
                  textAnchor="middle"
                  x={labelPoint.x}
                  y={labelPoint.y + 14}
                >
                  {dimension.score.toFixed(1)}
                </text>
              </g>
            );
          })}

          <polygon
            fill="rgba(37, 99, 235, 0.16)"
            pathLength={1}
            points={polygonPoints}
            stroke="rgb(37, 99, 235)"
            strokeDasharray={1}
            strokeDashoffset={1}
            strokeWidth="2"
            style={{ animation: "radar-draw 900ms ease-out forwards" }}
          />
          {dimensions.map((dimension, index) => {
            const point = polarToCartesian(
              centerX,
              centerY,
              maxRadius * (dimension.score / 10),
              index * axisAngle,
            );

            return (
              <circle
                cx={point.x}
                cy={point.y}
                fill={
                  highlightedKeySet.has(dimension.key)
                    ? "rgb(234, 88, 12)"
                    : "rgb(37, 99, 235)"
                }
                key={`${dimension.key}-point`}
                r={highlightedKeySet.has(dimension.key) ? "5" : "4"}
              />
            );
          })}
        </svg>
      </div>

      <div className="grid gap-2 md:grid-cols-2" id={`${descriptionId}-table`}>
        {dimensions.map((dimension) => (
          <div
            className="rounded-[18px] border border-border-muted bg-surface-muted px-4 py-3"
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
            {dimension.meta ? (
              <p className="mt-1 text-xs leading-5 text-text-muted">
                {dimension.meta}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
