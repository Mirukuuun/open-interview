import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import type { PracticeRecentExam } from "@/lib/schemas/practice";
import { SurfaceCard } from "@/components/ui/surface-card";
import { SectionHeading } from "@/components/workbench/section-heading";

import { PracticeRecentExamCard } from "./practice-recent-exam-card";

type PracticeRecentExamsPanelProps = {
  activeDimensionKey?: PracticeDimensionKey | null;
  recentExams: PracticeRecentExam[];
};

export function PracticeRecentExamsPanel({
  activeDimensionKey,
  recentExams,
}: PracticeRecentExamsPanelProps) {
  const displayedExams = recentExams.slice(0, 3);

  return (
    <SurfaceCard className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionHeading title="最近考试" />
        <p className="text-xs text-text-muted">最近 {displayedExams.length} 条</p>
      </div>

      {displayedExams.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border-strong bg-surface-muted px-4 py-5 text-sm leading-6 text-text-muted">
          完成第一场模拟考试后，这里会显示最近结果和薄弱项入口。
        </div>
      ) : (
        <div className="reveal-list space-y-3">
          {displayedExams.map((exam) => (
            <PracticeRecentExamCard
              activeDimensionKey={activeDimensionKey}
              exam={exam}
              key={exam.id}
            />
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}
