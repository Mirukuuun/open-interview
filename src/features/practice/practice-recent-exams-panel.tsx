import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import type { PracticeRecentExam } from "@/lib/schemas/practice";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyList } from "@/components/workbench/empty-list";

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
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[color:var(--color-foreground)]">最近考试</h3>
        <Button href="/interviews" variant="link">查看全部</Button>
      </CardHeader>

      <CardBody className="space-y-3">
        {displayedExams.length === 0 ? (
          <EmptyList
            title="还没有考试记录"
            description="完成第一场模拟考试后，这里会显示最近结果和薄弱项入口。"
            action={{ label: "做第一套模拟", href: "/practice" }}
          />
        ) : (
          <div className="space-y-3">
            {displayedExams.map((exam) => (
              <PracticeRecentExamCard
                activeDimensionKey={activeDimensionKey}
                exam={exam}
                key={exam.id}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
