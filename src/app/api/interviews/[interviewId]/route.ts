import { NextResponse } from "next/server";

import { getInterviewResponseDataSchema } from "@/lib/schemas/interviews";
import { apiError, apiOk } from "@/server/api/envelope";
import { interviewBrowseService } from "@/server/services/interview-browse-service";

type InterviewRouteProps = {
  params: Promise<{
    interviewId: string;
  }>;
};

export async function GET(_: Request, { params }: InterviewRouteProps) {
  const { interviewId } = await params;

  try {
    const interview = interviewBrowseService.getInterviewDetail(interviewId);

    if (!interview) {
      return NextResponse.json(
        apiError("not_found", "Interview was not found."),
        { status: 404 },
      );
    }

    const responseData = getInterviewResponseDataSchema.parse({
      interview_experience: {
        id: interview.id,
        source_document_id: interview.sourceDocumentId,
        company: interview.company,
        role: interview.role,
        round_info: interview.roundInfo,
        summary: interview.summary,
        question_count: interview.questionCount,
        tags: interview.tags,
        updated_at: interview.updatedAt,
        questions: interview.questions.map((question) => ({
          id: question.id,
          source_kind: question.sourceKind,
          question_text: question.questionText,
          source_answer: question.sourceAnswer,
          category: question.category,
          source_snippet: question.sourceSnippet,
          tags: question.tags,
          promoted_questions: question.promotedQuestions.map((promotedQuestion) => ({
            question_item_id: promotedQuestion.questionItemId,
            question_text: promotedQuestion.questionText,
            category: promotedQuestion.category,
            tags: promotedQuestion.tags,
            link_type: promotedQuestion.linkType,
          })),
          recommended_questions: question.recommendedQuestions.map(
            (recommendedQuestion) => ({
              id: recommendedQuestion.id,
              question_text: recommendedQuestion.questionText,
              category: recommendedQuestion.category,
              source_count: recommendedQuestion.sourceCount,
              tags: recommendedQuestion.tags,
              match_score: recommendedQuestion.score,
            }),
          ),
        })),
        source_document: {
          id: interview.sourceDocument.id,
          title: interview.sourceDocument.title,
          kind: interview.sourceDocument.kind,
          file_name: interview.sourceDocument.fileName,
          source_url: interview.sourceDocument.sourceUrl,
          raw_text: interview.sourceDocument.rawText,
          created_at: interview.sourceDocument.createdAt,
          updated_at: interview.sourceDocument.updatedAt,
        },
      },
    });

    return NextResponse.json(apiOk(responseData));
  } catch {
    return NextResponse.json(
      apiError("internal_error", "Failed to load interview detail."),
      { status: 500 },
    );
  }
}
