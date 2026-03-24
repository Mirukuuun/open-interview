import { NextResponse } from "next/server";

import { getQuestionResponseDataSchema } from "@/lib/schemas/questions";
import { apiError, apiOk } from "@/server/api/envelope";
import { questionBankService } from "@/server/services/question-bank-service";

type QuestionRouteProps = {
  params: Promise<{
    questionId: string;
  }>;
};

export async function GET(_: Request, { params }: QuestionRouteProps) {
  const { questionId } = await params;

  try {
    const question = questionBankService.getQuestionDetail(questionId);

    if (!question) {
      return NextResponse.json(
        apiError("not_found", "Question was not found."),
        { status: 404 },
      );
    }

    const responseData = getQuestionResponseDataSchema.parse({
      question_item: {
        id: question.id,
        question_text: question.questionText,
        canonical_answer: question.canonicalAnswer,
        category: question.category,
        difficulty: question.difficulty,
        source_count: question.sourceCount,
        review_status: question.reviewStatus,
        updated_at: question.updatedAt,
        tags: question.tags,
        has_personal_answer: question.hasPersonalAnswer,
        sources: question.sources.map((source) => ({
          source_document_id: source.sourceDocumentId,
          title: source.title,
          kind: source.kind,
          source_url: source.sourceUrl,
          source_snippet: source.sourceSnippet,
          interview_experience: source.interviewExperience
            ? {
                id: source.interviewExperience.id,
                company: source.interviewExperience.company,
                role: source.interviewExperience.role,
                round_info: source.interviewExperience.roundInfo,
              }
            : undefined,
        })),
        answer_variants: question.answerVariants.map((answerVariant) => ({
          id: answerVariant.id,
          variant_type: answerVariant.variantType,
          content: answerVariant.content,
        })),
        related_questions: question.relatedQuestions.map((relatedQuestion) => ({
          id: relatedQuestion.id,
          question_text: relatedQuestion.questionText,
          category: relatedQuestion.category,
          source_count: relatedQuestion.sourceCount,
          tags: relatedQuestion.tags,
          shared_source_count: relatedQuestion.sharedSourceCount,
        })),
      },
    });

    return NextResponse.json(apiOk(responseData));
  } catch {
    return NextResponse.json(
      apiError("internal_error", "Failed to load question detail."),
      { status: 500 },
    );
  }
}
