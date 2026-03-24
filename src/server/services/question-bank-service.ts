import type { ListQuestionsQuery } from "@/lib/schemas/questions";
import { questionBrowseRepository } from "@/server/repositories/question-browse-repository";

export const questionBankService = {
  listQuestions(input: {
    query?: string;
    category?: string;
    tag?: string;
    difficulty?: ListQuestionsQuery["difficulty"];
    hasPersonalAnswer?: boolean;
    sort?: ListQuestionsQuery["sort"];
    page?: number;
    pageSize?: number;
  }) {
    return questionBrowseRepository.list({
      query: input.query,
      category: input.category,
      tag: input.tag,
      difficulty: input.difficulty,
      hasPersonalAnswer: input.hasPersonalAnswer,
      sort: input.sort ?? "updated_at",
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });
  },

  getQuestionFacets() {
    return questionBrowseRepository.listFacets();
  },

  getQuestionDetail(questionId: string) {
    return questionBrowseRepository.findById(questionId);
  },
};
