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
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-[-0.03em] text-[color:var(--color-foreground)]">
            {scoreText}
          </p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted-foreground)]">
            {exam.question_count} 题 · {formatDateTimeLabel(exam.completed_at)}
          </p>
        </div>
        <Badge tone={exam.status === "completed" ? "success" : "warning"}>
          {exam.status === "completed" ? "完成" : "失败"}
        </Badge>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[color:var(--color-brand)]"
          style={{ width: `${scoreRatio}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted-foreground)]">
        {exam.weak_labels.length > 0
          ? `薄弱项：${exam.weak_labels.join(" / ")}`
          : "暂无薄弱项摘要"}
      </p>
      {exam.weak_areas.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {exam.weak_areas.map((area) => (
            <Button
              className="h-8 rounded-full px-3 text-xs"
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
