import type { ListQuestionsQuery } from "@/lib/schemas/questions";
import { questionBrowseRepository } from "@/server/repositories/question-browse-repository";

/**
 * [POS] 编排题库浏览、详情、相邻跳转与练习题池等题库读模型用例。
 * [IN] 题库查询条件、question id 与练习模式读取请求。
 * [OUT] 返回题库列表、详情、facets、相邻题与练习最小题目集合。
 *
 * @feature open-interview-questions-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

export const questionBankService = {
  listPracticePool() {
    return questionBrowseRepository.listPracticePool();
  },

  listQuestions(input: {
    query?: string;
    category?: string;
    tag?: string;
    difficulty?: ListQuestionsQuery["difficulty"];
    sort?: ListQuestionsQuery["sort"];
    page?: number;
    pageSize?: number;
  }) {
    return questionBrowseRepository.list({
      query: input.query,
      category: input.category,
      tag: input.tag,
      difficulty: input.difficulty,
      sort: input.sort ?? "updated_at",
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });
  },

  getQuestionFacets() {
    return questionBrowseRepository.listFacets();
  },

  getQuestionNavigation(input: {
    questionId: string;
    query?: string;
    category?: string;
    tag?: string;
    difficulty?: ListQuestionsQuery["difficulty"];
    sort?: ListQuestionsQuery["sort"];
    pageSize?: number;
  }) {
    return questionBrowseRepository.findAdjacent({
      questionId: input.questionId,
      query: input.query,
      category: input.category,
      tag: input.tag,
      difficulty: input.difficulty,
      sort: input.sort ?? "updated_at",
      page: 1,
      pageSize: input.pageSize ?? 20,
    });
  },

  getQuestionDetail(questionId: string) {
    return questionBrowseRepository.findById(questionId);
  },
};
