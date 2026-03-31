import { QuestionBankWorkbench } from "@/features/questions/question-bank-workbench";
import { parseQuestionSearchParams } from "@/features/questions/question-query-state";
import { questionBankService } from "@/server/services/question-bank-service";

type QuestionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuestionsPage({
  searchParams,
}: QuestionsPageProps) {
  const rawSearchParams = await searchParams;
  const { filters, invalidQuery } = parseQuestionSearchParams(rawSearchParams);
  const result = questionBankService.listQuestions({
    query: filters.q,
    category: filters.category,
    tag: filters.tag,
    difficulty: filters.difficulty,
    sort: filters.sort,
    page: filters.page,
    pageSize: filters.page_size,
  });
  const facets = questionBankService.getQuestionFacets();

  return (
    <QuestionBankWorkbench
      facets={facets}
      filters={filters}
      invalidQuery={invalidQuery}
      result={result}
    />
  );
}
