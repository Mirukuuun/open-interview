/**
 * [POS] 汇总工作台壳层所需的轻量摘要，供首页分流与导航 badge 复用。
 * [IN] 无显式入参；读取题库与审核队列的当前聚合状态。
 * [OUT] 返回 active question 数量与 needs_review 数量，不改变任何持久化状态。
 *
 * @feature open-interview-workbench-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 文档。
 */

import { parseReviewService } from "@/server/services/parse-review-service";
import { questionBankService } from "@/server/services/question-bank-service";

export const workspaceSummaryService = {
  getSummary() {
    const questionSummary = questionBankService.listQuestions({
      page: 1,
      pageSize: 1,
    });
    const reviewSummary = parseReviewService.listReviewQueue({
      status: "needs_review",
      page: 1,
      pageSize: 1,
    });

    return {
      activeQuestionCount: questionSummary.total,
      needsReviewCount: reviewSummary.statusSummary.needs_review,
    };
  },
};

export type WorkspaceSummary = ReturnType<typeof workspaceSummaryService.getSummary>;
