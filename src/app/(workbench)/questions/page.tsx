import { listQuestionsQuerySchema } from "@/lib/schemas/questions";
import { QuestionBankWorkbench } from "@/features/questions/question-bank-workbench";
import { questionBankService } from "@/server/services/question-bank-service";

type QuestionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QuestionsPage({
  searchParams,
}: QuestionsPageProps) {
  const rawSearchParams = await searchParams;
  const queryResult = listQuestionsQuerySchema.safeParse({
    q: getSearchParamValue(rawSearchParams.q),
    category: getSearchParamValue(rawSearchParams.category),
    tag: getSearchParamValue(rawSearchParams.tag),
    difficulty: getSearchParamValue(rawSearchParams.difficulty),
    sort: getSearchParamValue(rawSearchParams.sort),
    page: getSearchParamValue(rawSearchParams.page),
    page_size: getSearchParamValue(rawSearchParams.page_size),
  });
  const filters = queryResult.success
    ? queryResult.data
    : listQuestionsQuerySchema.parse({});
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
      invalidQuery={!queryResult.success}
      result={result}
    />
  );
}
