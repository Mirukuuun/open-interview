type DeepDiveProjectContext = {
  name: string;
  summary: string | null;
  highlights: string[];
  techStack: string[];
  deepDiveQuestions: string[];
};

type ContinueDeepDiveInput = {
  project: DeepDiveProjectContext;
  askedQuestions: string[];
  latestAnswer: string;
  relatedQuestions: Array<{
    id: string;
    questionText: string;
  }>;
};

function normalizeQuestion(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function answerMentionsOwnership(answer: string) {
  return /\b(i|my|me|owned|led|built|designed|implemented|shipped)\b|我|负责|主导|设计|实现/u.test(
    answer,
  );
}

function answerMentionsMetric(answer: string) {
  return /\d|%|ms|qps|tps|latency|throughput|sla|用户|请求|分钟|秒/u.test(answer);
}

function answerMentionsTradeoff(answer: string) {
  return /trade[- ]?off|constraint|risk|failure|fallback|consistency|成本|风险|取舍|兜底|一致性/u.test(
    answer,
  );
}

function buildFallbackQuestions(project: DeepDiveProjectContext) {
  return [
    `How did you scope the success criteria for ${project.name} before implementation started?`,
    `What was the hardest technical trade-off in ${project.name}, and why did you choose that path?`,
    `If ${project.name} failed in production, what was the first signal and how did you recover?`,
    project.techStack.length > 0
      ? `How would you defend the use of ${project.techStack.slice(0, 2).join(" and ")} in ${project.name}?`
      : `What would you redesign in ${project.name} if the traffic doubled tomorrow?`,
  ];
}

function buildCoachHints(input: ContinueDeepDiveInput) {
  const hints: string[] = [];

  if (!answerMentionsOwnership(input.latestAnswer)) {
    hints.push("State your direct ownership and decisions, not only what the team did.");
  }

  if (!answerMentionsMetric(input.latestAnswer)) {
    hints.push("Add one concrete metric, scale number, latency, or business impact.");
  }

  if (!answerMentionsTradeoff(input.latestAnswer)) {
    hints.push("Call out one trade-off, risk, or failure mode and how you handled it.");
  }

  if (input.project.techStack.length > 0) {
    hints.push(
      `Explain why ${input.project.techStack.slice(0, 2).join(" and ")} fit this project and what it cost you.`,
    );
  }

  return Array.from(new Set(hints)).slice(0, 3);
}

function pickNextQuestion(input: ContinueDeepDiveInput) {
  const askedQuestionSet = new Set(input.askedQuestions.map(normalizeQuestion));
  const candidateQuestions = [
    ...input.project.deepDiveQuestions,
    ...buildFallbackQuestions(input.project),
    ...input.relatedQuestions.map(
      (question) =>
        `If the interviewer asks "${question.questionText}", how would you tie it back to ${input.project.name}?`,
    ),
  ];

  for (const candidateQuestion of candidateQuestions) {
    if (!askedQuestionSet.has(normalizeQuestion(candidateQuestion))) {
      return candidateQuestion;
    }
  }

  return `What would you improve next in ${input.project.name} after what you learned from shipping it?`;
}

export const openClawProjectDeepDiveAdapter = {
  start(input: { project: DeepDiveProjectContext }) {
    return (
      input.project.deepDiveQuestions[0] ??
      `What problem was ${input.project.name} solving, and what part did you personally own?`
    );
  },

  continue(input: ContinueDeepDiveInput) {
    return {
      nextQuestion: pickNextQuestion(input),
      coachHints: buildCoachHints(input),
    };
  },
};
