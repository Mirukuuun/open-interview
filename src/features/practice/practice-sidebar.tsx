import { Target } from "lucide-react";

import type { PracticeDimensionKey } from "@/lib/practice-dimensions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { EmptyList } from "@/components/workbench/empty-list";
import { SectionHeading } from "@/components/workbench/section-heading";

import { PracticeProfileSummaryCard } from "./practice-profile-summary-card";
import { PracticeRecentExamCard } from "./practice-recent-exam-card";
import type { PracticeProfileState } from "./practice-view-model";
import type { PracticeRecentExam } from "@/lib/schemas/practice";

type PracticeSidebarProps = {
  activeDimension: {
    key: PracticeDimensionKey;
    label: string;
  } | null;
  recentExams: PracticeRecentExam[];
  profileState: PracticeProfileState;
};

export function PracticeSidebar({
  activeDimension,
  recentExams,
  profileState,
}: PracticeSidebarProps) {
  return (
    <div className="space-y-6">
      {activeDimension ? (
        <SurfaceCard className="space-y-4">
          <SectionHeading
            description="退出过滤后会回到全量随机练习与全量考试抽题。"
            title={`当前定向维度：${activeDimension.label}`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="accent">题池已过滤</Badge>
            <Button href="/practice">退出定向练习</Button>
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="space-y-4">
        <SectionHeading
          description="左侧保留训练摘要、长期画像和最近成绩，右侧专注当前题目或考试流程。"
          title="训练方式"
        />
        <div className="space-y-3 text-sm leading-6 text-text-strong">
          <p>随机练习：适合碎片时间快速刷题，单轮不重复。</p>
          <p>模拟考试：固定抽取 10 题，提交后统一评分、识别薄弱项并增量更新长期画像。</p>
        </div>
      </SurfaceCard>

      <PracticeProfileSummaryCard
        activeDimensionKey={activeDimension?.key}
        dimensions={profileState.dimensions}
        profile={profileState.profile}
      />

      <SurfaceCard className="space-y-4">
        <SectionHeading title="最近考试" />
        {recentExams.length === 0 ? (
          <EmptyList
            description="开始第一套 10 题考试后，这里会显示最近结果和薄弱项摘要。"
            icon={Target}
            title="完成你的第一场模拟考试"
          />
        ) : (
          <div className="reveal-list space-y-3">
            {recentExams.map((exam) => (
              <PracticeRecentExamCard
                activeDimensionKey={activeDimension?.key}
                exam={exam}
                key={exam.id}
              />
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
