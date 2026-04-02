import type {
  PracticeProfile,
  PracticeProfileDimension,
  PracticeQuestion,
  PracticeRecentExam,
} from "@/lib/schemas/practice";
import type { PracticeDimensionKey } from "@/lib/practice-dimensions";

import { PracticeWorkbenchClient } from "./practice-workbench-client";

type PracticeWorkbenchProps = {
  activeDimension: {
    key: PracticeDimensionKey;
    label: string;
  } | null;
  practicePool: PracticeQuestion[];
  recentExams: PracticeRecentExam[];
  practiceProfile: {
    profile: PracticeProfile;
    dimensions: PracticeProfileDimension[];
  };
};

export function PracticeWorkbench({
  activeDimension,
  practicePool,
  recentExams,
  practiceProfile,
}: PracticeWorkbenchProps) {
  return (
    <PracticeWorkbenchClient
      activeDimension={activeDimension}
      practicePool={practicePool}
      practiceProfile={practiceProfile}
      recentExams={recentExams}
    />
  );
}
