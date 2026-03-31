import type {
  PracticeProfile,
  PracticeProfileDimension,
  PracticeQuestion,
  PracticeRecentExam,
} from "@/lib/schemas/practice";

import { PracticeWorkbenchClient } from "./practice-workbench-client";

type PracticeWorkbenchProps = {
  practicePool: PracticeQuestion[];
  recentExams: PracticeRecentExam[];
  practiceProfile: {
    profile: PracticeProfile;
    dimensions: PracticeProfileDimension[];
  };
};

export function PracticeWorkbench({
  practicePool,
  recentExams,
  practiceProfile,
}: PracticeWorkbenchProps) {
  return (
    <PracticeWorkbenchClient
      practicePool={practicePool}
      practiceProfile={practiceProfile}
      recentExams={recentExams}
    />
  );
}
