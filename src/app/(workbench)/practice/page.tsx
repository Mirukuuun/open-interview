import { PracticeWorkbench } from "@/features/practice/practice-workbench";
import { practiceService } from "@/server/services/practice-service";

export default function PracticePage() {
  const data = practiceService.getPracticePageData();

  return (
    <PracticeWorkbench
      practicePool={data.practicePool}
      practiceProfile={data.practiceProfile}
      recentExams={data.recentExams}
    />
  );
}
