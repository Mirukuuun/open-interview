import type { ListQuestionsQuery } from "@/lib/schemas/questions";
import { listQuestionsQuerySchema } from "@/lib/schemas/questions";

export function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseQuestionSearchParams(
  rawSearchParams: Record<string, string | string[] | undefined>,
) {
  const queryResult = listQuestionsQuerySchema.safeParse({
    q: getSearchParamValue(rawSearchParams.q),
    category: getSearchParamValue(rawSearchParams.category),
    tag: getSearchParamValue(rawSearchParams.tag),
    difficulty: getSearchParamValue(rawSearchParams.difficulty),
    sort: getSearchParamValue(rawSearchParams.sort),
    page: getSearchParamValue(rawSearchParams.page),
    page_size: getSearchParamValue(rawSearchParams.page_size),
  });

  return {
    filters: queryResult.success
      ? queryResult.data
      : listQuestionsQuerySchema.parse({}),
    invalidQuery: !queryResult.success,
  };
}

function buildQuestionSearchParams(filters: Partial<ListQuestionsQuery>) {
  const searchParams = new URLSearchParams();

  if (filters.q) {
    searchParams.set("q", filters.q);
  }

  if (filters.category) {
    searchParams.set("category", filters.category);
  }

  if (filters.tag) {
    searchParams.set("tag", filters.tag);
  }

  if (filters.difficulty) {
    searchParams.set("difficulty", filters.difficulty);
  }

  if (filters.sort && filters.sort !== "updated_at") {
    searchParams.set("sort", filters.sort);
  }

  if (filters.page && filters.page > 1) {
    searchParams.set("page", String(filters.page));
  }

  if (filters.page_size && filters.page_size !== 20) {
    searchParams.set("page_size", String(filters.page_size));
  }

  return searchParams;
}

export function buildQuestionsHref(filters: Partial<ListQuestionsQuery>) {
  const queryString = buildQuestionSearchParams(filters).toString();

  return queryString.length > 0 ? `/questions?${queryString}` : "/questions";
}

export function buildQuestionDetailHref(
  questionId: string,
  filters: Partial<ListQuestionsQuery>,
) {
  const queryString = buildQuestionSearchParams(filters).toString();

  return queryString.length > 0
    ? `/questions/${questionId}?${queryString}`
    : `/questions/${questionId}`;
}
