import { interviewBrowseRepository } from "@/server/repositories/interview-browse-repository";
import { listRecommendedQuestionsForInterviewQuestion } from "@/server/repositories/question-recommendation-repository";

/**
 * [POS] 编排面经列表、详情以及面经题到题库题的推荐读模型。
 * [IN] 面经筛选条件、interview id。
 * [OUT] 返回面经列表、详情、facets，以及带推荐题库题的面经题详情。
 *
 * @feature open-interview-interviews-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

export const interviewBrowseService = {
  listInterviews(input: {
    query?: string;
    company?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  }) {
    return interviewBrowseRepository.list({
      query: input.query,
      company: input.company,
      tag: input.tag,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });
  },

  getInterviewFacets() {
    return interviewBrowseRepository.listFacets();
  },

  getInterviewDetail(interviewId: string) {
    const interview = interviewBrowseRepository.findById(interviewId);

    if (!interview) {
      return undefined;
    }

    return {
      ...interview,
      questions: interview.questions.map((question) => ({
        ...question,
        recommendedQuestions:
          question.sourceKind === "interview_question"
            ? listRecommendedQuestionsForInterviewQuestion({
                questionText: question.questionText,
                category: question.category,
                tags: question.tags,
                excludeQuestionIds: question.promotedQuestions.map(
                  (promotedQuestion) => promotedQuestion.questionItemId,
                ),
                limit: 3,
              })
            : [],
      })),
    };
  },
};
