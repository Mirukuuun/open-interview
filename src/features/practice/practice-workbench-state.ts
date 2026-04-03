import type {
  AssessmentItem,
  AssessmentResultSummary,
  CreateAssessmentSessionResponseData,
  PracticeQuestion,
  SubmitAssessmentSessionResponseData,
} from "@/lib/schemas/practice";

export type PracticeMode = "drill" | "exam";

export type DrillState = {
  queue: PracticeQuestion[];
  currentIndex: number;
  revealed: boolean;
};

export type ExamState = {
  sessionId: string;
  items: AssessmentItem[];
  answers: Record<string, string>;
  resultSummary: AssessmentResultSummary | null;
  totalScore: number | null;
  maxScore: number;
};

export function shuffleArray<T>(items: T[]) {
  const copiedItems = [...items];

  for (let index = copiedItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = copiedItems[index];

    copiedItems[index] = copiedItems[randomIndex] as T;
    copiedItems[randomIndex] = currentValue as T;
  }

  return copiedItems;
}

export function buildExamState(
  payload: CreateAssessmentSessionResponseData | SubmitAssessmentSessionResponseData,
): ExamState {
  return {
    sessionId: payload.assessment_session.id,
    items: payload.items,
    answers: Object.fromEntries(
      payload.items.map((item) => [item.id, item.user_answer ?? ""]),
    ),
    resultSummary:
      "result_summary" in payload ? payload.result_summary ?? null : null,
    totalScore: payload.assessment_session.total_score ?? null,
    maxScore: payload.assessment_session.max_score,
  };
}
