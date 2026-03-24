import { listInterviewsQuerySchema } from "@/lib/schemas/interviews";
import { InterviewListWorkbench } from "@/features/interviews/interview-list-workbench";
import { interviewBrowseService } from "@/server/services/interview-browse-service";

type InterviewsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InterviewsPage({
  searchParams,
}: InterviewsPageProps) {
  const rawSearchParams = await searchParams;
  const queryResult = listInterviewsQuerySchema.safeParse({
    q: getSearchParamValue(rawSearchParams.q),
    company: getSearchParamValue(rawSearchParams.company),
    tag: getSearchParamValue(rawSearchParams.tag),
    page: getSearchParamValue(rawSearchParams.page),
    page_size: getSearchParamValue(rawSearchParams.page_size),
  });
  const filters = queryResult.success
    ? queryResult.data
    : listInterviewsQuerySchema.parse({});
  const result = interviewBrowseService.listInterviews({
    query: filters.q,
    company: filters.company,
    tag: filters.tag,
    page: filters.page,
    pageSize: filters.page_size,
  });
  const facets = interviewBrowseService.getInterviewFacets();

  return (
    <InterviewListWorkbench
      facets={facets}
      filters={filters}
      invalidQuery={!queryResult.success}
      result={result}
    />
  );
}
