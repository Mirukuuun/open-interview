import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeLabel } from "@/lib/date-time";
import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import type { PracticeRecentExam } from "@/lib/schemas/practice";

type PracticeRecentExamCardProps = {
  activeDimensionKey?: PracticeDimensionKey | null;
  exam: PracticeRecentExam;
};

export function PracticeRecentExamCard({
  activeDimensionKey,
  exam,
}: PracticeRecentExamCardProps) {
  const totalScore = typeof exam.total_score === "number" ? exam.total_score : null;
  const scoreText =
    totalScore === null ? "评分失败" : `${totalScore}/${exam.max_score}`;
  const scoreRatio =
    totalScore === null || exam.max_score === 0
      ? 0
      : Math.min(100, (totalScore / exam.max_score) * 100);

  return (
    <div className="rounded-[24px] border border-border-muted bg-surface-muted px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold tracking-[-0.04em] text-text-strong">
          {scoreText}
        </p>
        <Badge tone={exam.status === "completed" ? "success" : "warning"}>
          {exam.status}
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${scoreRatio}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-text-muted">
        {exam.question_count} 题 · {formatDateTimeLabel(exam.completed_at)}
      </p>
      <p className="mt-2 text-sm text-text-strong">
        {exam.weak_labels.length > 0
          ? `薄弱项：${exam.weak_labels.join(" / ")}`
          : "暂无薄弱项摘要"}
      </p>
      {exam.weak_areas.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {exam.weak_areas.map((area) => (
            <Button
              href={`/practice?dimension=${area.key}`}
              key={`${exam.id}-${area.key}`}
              variant={activeDimensionKey === area.key ? "primary" : "secondary"}
            >
              练 {area.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
