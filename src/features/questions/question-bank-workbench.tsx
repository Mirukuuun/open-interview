import Link from "next/link";

import type { ListQuestionsQuery } from "@/lib/schemas/questions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SurfaceCard } from "@/components/ui/surface-card";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { questionBankService } from "@/server/services/question-bank-service";

type QuestionBankWorkbenchProps = {
  filters: ListQuestionsQuery;
  result: ReturnType<typeof questionBankService.listQuestions>;
  facets: ReturnType<typeof questionBankService.getQuestionFacets>;
  invalidQuery?: boolean;
};

function buildQuestionsHref(filters: Partial<ListQuestionsQuery>) {
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

  if (filters.has_personal_answer !== undefined) {
    searchParams.set(
      "has_personal_answer",
      String(filters.has_personal_answer),
    );
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

  const queryString = searchParams.toString();

  return queryString.length > 0 ? `/questions?${queryString}` : "/questions";
}

function countActiveFilters(filters: ListQuestionsQuery) {
  return [
    filters.q,
    filters.category,
    filters.tag,
    filters.difficulty,
    filters.has_personal_answer,
    filters.sort !== "updated_at" ? filters.sort : undefined,
  ].filter((value) => value !== undefined).length;
}

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function renderTagList(tags: string[]) {
  if (tags.length === 0) {
    return <span className="text-text-muted">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag}>{tag}</Badge>
      ))}
    </div>
  );
}

export function QuestionBankWorkbench({
  filters,
  result,
  facets,
  invalidQuery = false,
}: QuestionBankWorkbenchProps) {
  const rangeStart =
    result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd =
    result.total === 0 ? 0 : Math.min(result.page * result.pageSize, result.total);
  const previousHref =
    result.page > 1
      ? buildQuestionsHref({
          ...filters,
          page: result.page - 1,
        })
      : undefined;
  const nextHref =
    result.page * result.pageSize < result.total
      ? buildQuestionsHref({
          ...filters,
          page: result.page + 1,
        })
      : undefined;
  const sampleQuestionHref = result.items[0]
    ? `/questions/${result.items[0].id}`
    : "/questions";

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/interviews">查看面经</Button>
            <Button href={sampleQuestionHref} variant="primary">
              打开最新题目
            </Button>
          </>
        }
        description="按关键词、分类和标签浏览已确认题目。"
        routeLabel="/questions"
        title="题库"
      />

      <DetailGrid
        items={[
          { label: "结果数", value: `${result.total}` },
          { label: "当前范围", value: `${rangeStart}-${rangeEnd}` },
          { label: "筛选数", value: `${countActiveFilters(filters)}` },
          { label: "排序", value: filters.sort },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading title="筛选" />

          {invalidQuery ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning">
              部分查询参数无效，已忽略。
            </div>
          ) : null}

          <form action="/questions" className="space-y-4" method="GET">
            <input name="page_size" type="hidden" value={String(filters.page_size)} />

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-strong" htmlFor="q">
                关键词
              </label>
              <Input
                defaultValue={filters.q ?? ""}
                id="q"
                name="q"
                placeholder="搜索题目、答案、分类或标签"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-text-strong"
                htmlFor="category"
              >
                分类
              </label>
              <Select defaultValue={filters.category ?? ""} id="category" name="category">
                <option value="">全部分类</option>
                {facets.categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-strong" htmlFor="tag">
                标签
              </label>
              <Select defaultValue={filters.tag ?? ""} id="tag" name="tag">
                <option value="">全部标签</option>
                {facets.tags.map((tag) => (
                  <option key={tag.name} value={tag.name}>
                    {tag.name} ({tag.count})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-text-strong"
                htmlFor="difficulty"
              >
                难度
              </label>
              <Select
                defaultValue={filters.difficulty ?? ""}
                id="difficulty"
                name="difficulty"
              >
                <option value="">全部难度</option>
                {facets.difficulties.map((difficulty) => (
                  <option key={difficulty.name} value={difficulty.name}>
                    {difficulty.name} ({difficulty.count})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-text-strong"
                htmlFor="has_personal_answer"
              >
                个人答案
              </label>
              <Select
                defaultValue={
                  filters.has_personal_answer === undefined
                    ? ""
                    : String(filters.has_personal_answer)
                }
                id="has_personal_answer"
                name="has_personal_answer"
              >
                <option value="">全部题目</option>
                <option value="true">有个人答案</option>
                <option value="false">仅标准答案</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-strong" htmlFor="sort">
                排序
              </label>
              <Select defaultValue={filters.sort} id="sort" name="sort">
                <option value="updated_at">最近更新</option>
                <option value="source_count">来源最多</option>
              </Select>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="primary">
                应用筛选
              </Button>
              <Button href="/questions">重置</Button>
            </div>
          </form>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              title="题目列表"
            />
            <p className="font-mono text-xs text-text-muted">
              {rangeStart}-{rangeEnd} / {result.total}
            </p>
          </div>

          {result.items.length === 0 ? (
            <EmptyList
              bullets={[
                "确认后的题目会出现在这里。",
                "关键词会覆盖题目、标准答案、分类和标签。",
                "题目详情页会保留答案变体和来源链接。",
              ]}
              description="当前筛选下没有匹配题目。"
              title="没有匹配题目"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    {[
                      "题目",
                      "分类",
                      "标签",
                      "来源数",
                      "更新时间",
                      "详情",
                    ].map((column) => (
                      <th
                        className="border-b border-border-muted px-3 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted"
                        key={column}
                        scope="col"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr className="align-top" key={item.id}>
                      <td className="border-b border-border-muted px-3 py-4">
                        <div className="space-y-2">
                          <Link
                            className="text-sm font-semibold text-text-strong hover:text-accent"
                            href={`/questions/${item.id}`}
                          >
                            {item.questionText}
                          </Link>
                          <div className="flex flex-wrap gap-2">
                            <Badge tone="accent">题目</Badge>
                            <Badge
                              tone={
                                item.hasPersonalAnswer ? "success" : "neutral"
                              }
                            >
                              {item.hasPersonalAnswer
                                ? "标准 + 个人"
                                : "标准"}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm text-text-strong">
                        {item.category ?? <span className="text-text-muted">-</span>}
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm">
                        {renderTagList(item.tags)}
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm font-medium text-text-strong">
                        {item.sourceCount}
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm text-text-muted">
                        {formatDateTime(item.updatedAt)}
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm">
                        <Link
                          className="font-medium text-accent hover:underline"
                          href={`/questions/${item.id}`}
                        >
                          打开详情
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-muted pt-4">
            <p className="text-sm text-text-muted">
              进入详情页可继续查看答案变体和关联来源。
            </p>
            <div className="flex flex-wrap gap-2">
              {previousHref ? (
                <Button href={previousHref}>上一页</Button>
              ) : (
                <Button disabled>上一页</Button>
              )}
              {nextHref ? (
                <Button href={nextHref}>下一页</Button>
              ) : (
                <Button disabled>下一页</Button>
              )}
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
