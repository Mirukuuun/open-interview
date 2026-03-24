import type { QaCitation } from "@/lib/schemas/qa";

type OpenClawQaRequest = {
  query: string;
  sessionType: "qa";
  contextPacket: {
    hits: Array<{
      owner_type: string;
      owner_id: string;
      snippet: string;
      score: number;
    }>;
    citations: QaCitation[];
    relatedQuestions: Array<{
      id: string;
      question_text: string;
    }>;
    sessionHistory?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    questionContexts: Array<{
      questionText: string;
      canonicalAnswer: string | null;
      personalAnswer: string | null;
      sourceSnippet: string | null;
    }>;
  };
};

function trimSentence(value: string, maxLength: number) {
  const compactValue = value.replace(/\s+/g, " ").trim();

  if (compactValue.length <= maxLength) {
    return compactValue;
  }

  return `${compactValue.slice(0, maxLength - 3).trimEnd()}...`;
}

export const openClawGroundedQaAdapter = {
  async answer(input: OpenClawQaRequest) {
    if (input.contextPacket.citations.length === 0) {
      return {
        answer:
          "I could not find enough grounded local support to answer this reliably. Add or confirm more material, or ask a more specific question.",
        citations: [],
        relatedQuestions: input.contextPacket.relatedQuestions,
      };
    }

    const [primaryContext, secondaryContext] = input.contextPacket.questionContexts;
    const lines: string[] = [];

    lines.push(
      primaryContext?.canonicalAnswer
        ? `Lead with: ${trimSentence(primaryContext.canonicalAnswer, 220)}`
        : `Lead with the core idea from "${primaryContext?.questionText ?? input.query}".`,
    );

    if (secondaryContext?.canonicalAnswer) {
      lines.push(
        `Then connect it to: ${trimSentence(secondaryContext.canonicalAnswer, 180)}`,
      );
    }

    const personalExample = input.contextPacket.questionContexts.find(
      (context) =>
        context.personalAnswer &&
        context.personalAnswer !== context.canonicalAnswer,
    )?.personalAnswer;

    if (personalExample) {
      lines.push(`Personal angle: ${trimSentence(personalExample, 180)}`);
    }

    if (input.contextPacket.relatedQuestions.length > 0) {
      lines.push(
        `Expect follow-ups on: ${input.contextPacket.relatedQuestions
          .slice(0, 3)
          .map((question) => question.question_text)
          .join(" / ")}`,
      );
    }

    return {
      answer: lines.join("\n\n"),
      citations: input.contextPacket.citations,
      relatedQuestions: input.contextPacket.relatedQuestions,
    };
  },
};
