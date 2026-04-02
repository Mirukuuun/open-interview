import Link from "next/link";

import type { ListInterviewsQuery } from "@/lib/schemas/interviews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SurfaceCard } from "@/components/ui/surface-card";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { formatDateTimeLabel } from "@/lib/date-time";
import { formatTagLabel } from "@/lib/taxonomy-display";
import { interviewBrowseService } from "@/server/services/interview-browse-service";

type InterviewListWorkbenchProps = {
  filters: ListInterviewsQuery;
  result: ReturnType<typeof interviewBrowseService.listInterviews>;
  facets: ReturnType<typeof interviewBrowseService.getInterviewFacets>;
  invalidQuery?: boolean;
};

function buildInterviewsHref(filters: Partial<ListInterviewsQuery>) {
  const searchParams = new URLSearchParams();

  if (filters.q) {
    searchParams.set("q", filters.q);
  }

  if (filters.company) {
    searchParams.set("company", filters.company);
  }

  if (filters.tag) {
    searchParams.set("tag", filters.tag);
  }

  if (filters.page && filters.page > 1) {
    searchParams.set("page", String(filters.page));
  }

  if (filters.page_size && filters.page_size !== 20) {
    searchParams.set("page_size", String(filters.page_size));
  }

  const queryString = searchParams.toString();

  return queryString.length > 0 ? `/interviews?${queryString}` : "/interviews";
}

function countActiveFilters(filters: ListInterviewsQuery) {
  return [filters.q, filters.company, filters.tag].filter(Boolean).length;
}

function groupInterviewsByCompany(
  items: ReturnType<typeof interviewBrowseService.listInterviews>["items"],
) {
  const groupedItems = new Map<string, typeof items>();

  items.forEach((item) => {
    const company = item.company ?? "未知公司";
    const currentItems = groupedItems.get(company) ?? [];

    currentItems.push(item);
    groupedItems.set(company, currentItems);
  });

  return Array.from(groupedItems.entries()).map(([company, items]) => ({
    company,
    items,
  }));
}

function getPromotionStatusMeta(
  item: ReturnType<typeof interviewBrowseService.listInterviews>["items"][number],
) {
  if (item.questionCount === 0) {
    return {
      label: "暂无题目",
      tone: "neutral" as const,
    };
  }

  if (item.promotedQuestionCount === 0) {
    return {
      label: "待沉淀",
      tone: "warning" as const,
    };
  }

  if (item.promotedQuestionCount < item.questionCount) {
    return {
      label: "部分沉淀",
      tone: "accent" as const,
    };
  }

  return {
    label: "已沉淀",
    tone: "success" as const,
  };
}

function renderTagList(tags: string[]) {
  if (tags.length === 0) {
    return <span className="text-text-muted">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag}>{formatTagLabel(tag) ?? tag}</Badge>
      ))}
    </div>
  );
}

export function InterviewListWorkbench({
  filters,
  result,
  facets,
  invalidQuery = false,
}: InterviewListWorkbenchProps) {
  const groupedInterviews = groupInterviewsByCompany(result.items);
  const rangeStart =
    result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd =
    result.total === 0 ? 0 : Math.min(result.page * result.pageSize, result.total);
  const previousHref =
    result.page > 1
      ? buildInterviewsHref({
          ...filters,
          page: result.page - 1,
        })
      : undefined;
  const nextHref =
    result.page * result.pageSize < result.total
      ? buildInterviewsHref({
          ...filters,
          page: result.page + 1,
        })
      : undefined;
  const sampleInterviewHref = result.items[0]
    ? `/interviews/${result.items[0].id}`
    : "/interviews";

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/questions">查看题库</Button>
            <Button href={sampleInterviewHref} variant="primary">
              打开最新面经
            </Button>
          </>
        }
        routeLabel="/interviews"
        title="面经"
      />

      <DetailGrid
        items={[
          { label: "结果数", value: `${result.total}` },
          { label: "当前范围", value: `${rangeStart}-${rangeEnd}` },
          { label: "筛选数", value: `${countActiveFilters(filters)}` },
          { label: "公司数", value: `${facets.companies.length}` },
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

          <form action="/interviews" className="space-y-4" method="GET">
            <input name="page_size" type="hidden" value={String(filters.page_size)} />

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-strong" htmlFor="q">
                关键词
              </label>
              <Input
                defaultValue={filters.q ?? ""}
                id="q"
                name="q"
                placeholder="搜索公司、岗位、摘要或来源"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-text-strong"
                htmlFor="company"
              >
                公司
              </label>
              <Select defaultValue={filters.company ?? ""} id="company" name="company">
                <option value="">全部公司</option>
                {facets.companies.map((company) => (
                  <option key={company.name} value={company.name}>
                    {company.name} ({company.count})
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
                    {formatTagLabel(tag.name) ?? tag.name} ({tag.count})
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="primary">
                应用筛选
              </Button>
              <Button href="/interviews">重置</Button>
            </div>
          </form>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              title="面经列表"
            />
            <p className="font-mono text-xs text-text-muted">
              {rangeStart}-{rangeEnd} / {result.total}
            </p>
          </div>

          {result.items.length === 0 ? (
            <EmptyList title="没有匹配面经" />
          ) : (
            <div className="space-y-6">
              {groupedInterviews.map((group) => (
                <div className="space-y-3" key={group.company}>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-muted bg-surface-muted px-4 py-4">
                    <div>
                      <p className="text-lg font-semibold tracking-[-0.03em] text-text-strong">
                        {group.company}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        {group.items.length} 条面经
                      </p>
                    </div>
                    <Badge>{group.items.length}</Badge>
                  </div>

                  <div className="grid gap-3">
                    {group.items.map((item) => {
                      const promotionStatus = getPromotionStatusMeta(item);

                      return (
                        <div
                          className="rounded-2xl border border-border-muted bg-white px-4 py-4"
                          key={item.id}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  className="text-sm font-semibold text-text-strong hover:text-accent"
                                  href={`/interviews/${item.id}`}
                                >
                                  {item.role ?? "未知岗位"} / {item.roundInfo ?? "轮次未标注"}
                                </Link>
                                <Badge tone={promotionStatus.tone}>
                                  {promotionStatus.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-text-muted">{item.sourceTitle}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge>
                                题目 {item.questionCount}
                              </Badge>
                              <Badge tone="success">
                                已沉淀 {item.promotedQuestionCount}
                              </Badge>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-text-strong">
                            {item.summary ?? "还没有面经摘要。"}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-muted">
                            <span>更新于 {formatDateTimeLabel(item.updatedAt)}</span>
                            <span>待处理 {Math.max(0, item.questionCount - item.promotedQuestionCount)} 道</span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            {renderTagList(item.tags)}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <Button href={`/interviews/${item.id}`} variant="primary">
                              打开详情
                            </Button>
                            <Button href="/questions">查看题库</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-muted pt-4">
            <p className="text-sm text-text-muted">
              进入详情页可查看原始上下文并跳转到关联题目。
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
