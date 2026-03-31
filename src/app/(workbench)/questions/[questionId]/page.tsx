import { notFound } from "next/navigation";

import { QuestionDetailWorkbench } from "@/features/questions/question-detail-workbench";
import { parseQuestionSearchParams } from "@/features/questions/question-query-state";
import { questionBankService } from "@/server/services/question-bank-service";

type QuestionDetailPageProps = {
  params: Promise<{
    questionId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuestionDetailPage({
  params,
  searchParams,
}: QuestionDetailPageProps) {
  const { questionId } = await params;
  const { filters } = parseQuestionSearchParams(await searchParams);
  const question = questionBankService.getQuestionDetail(questionId);
  const navigation = questionBankService.getQuestionNavigation({
    questionId,
    query: filters.q,
    category: filters.category,
    tag: filters.tag,
    difficulty: filters.difficulty,
    sort: filters.sort,
    pageSize: filters.page_size,
  });

  if (!question) {
    notFound();
  }

  return (
    <QuestionDetailWorkbench
      filters={filters}
      navigation={navigation}
      question={question}
    />
  );
}
