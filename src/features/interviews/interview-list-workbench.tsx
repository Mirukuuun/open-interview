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

export function InterviewListWorkbench({
  filters,
  result,
  facets,
  invalidQuery = false,
}: InterviewListWorkbenchProps) {
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
            <Button href="/questions">Browse questions</Button>
            <Button href={sampleInterviewHref} variant="primary">
              Open latest interview
            </Button>
          </>
        }
        description="Browse confirmed interview experiences by source, then jump into linked canonical questions without losing the source context."
        routeLabel="/interviews"
        title="Interview Notes"
      />

      <DetailGrid
        items={[
          { label: "results", value: `${result.total}` },
          { label: "showing", value: `${rangeStart}-${rangeEnd}` },
          { label: "active filters", value: `${countActiveFilters(filters)}` },
          { label: "linked companies", value: `${facets.companies.length}` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="Source-oriented browsing complements the question bank instead of replacing it."
            title="Filters"
          />

          {invalidQuery ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning">
              Some query parameters were ignored because they were invalid.
            </div>
          ) : null}

          <form action="/interviews" className="space-y-4" method="GET">
            <input name="page_size" type="hidden" value={String(filters.page_size)} />

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-strong" htmlFor="q">
                Keyword
              </label>
              <Input
                defaultValue={filters.q ?? ""}
                id="q"
                name="q"
                placeholder="Search company, role, summary, source title, or raw text"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-text-strong"
                htmlFor="company"
              >
                Company
              </label>
              <Select defaultValue={filters.company ?? ""} id="company" name="company">
                <option value="">All companies</option>
                {facets.companies.map((company) => (
                  <option key={company.name} value={company.name}>
                    {company.name} ({company.count})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-strong" htmlFor="tag">
                Tag
              </label>
              <Select defaultValue={filters.tag ?? ""} id="tag" name="tag">
                <option value="">All tags</option>
                {facets.tags.map((tag) => (
                  <option key={tag.name} value={tag.name}>
                    {tag.name} ({tag.count})
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="primary">
                Apply filters
              </Button>
              <Button href="/interviews">Reset</Button>
            </div>
          </form>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              description="Each row keeps the source view dense: company, round, summary, question count, and direct detail link."
              title="Interview list"
            />
            <p className="font-mono text-xs text-text-muted">
              {rangeStart}-{rangeEnd} of {result.total}
            </p>
          </div>

          {result.items.length === 0 ? (
            <EmptyList
              bullets={[
                "Interview records appear here after review-confirmed imports.",
                "Keyword search spans interview metadata and raw source text.",
                "Interview detail pages keep linked questions and the raw source together.",
              ]}
              description="No interview experiences matched the current filters."
              title="No matching interviews"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    {[
                      "company",
                      "role / round",
                      "summary",
                      "question_count",
                      "tags",
                      "updated_at",
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
                            href={`/interviews/${item.id}`}
                          >
                            {item.company ?? "Unknown company"}
                          </Link>
                          <p className="text-sm text-text-muted">{item.sourceTitle}</p>
                        </div>
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm text-text-strong">
                        <div>{item.role ?? "-"}</div>
                        <div className="mt-1 text-text-muted">
                          {item.roundInfo ?? "Round unspecified"}
                        </div>
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm text-text-strong">
                        {item.summary ?? <span className="text-text-muted">-</span>}
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm font-medium text-text-strong">
                        {item.questionCount}
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm">
                        {renderTagList(item.tags)}
                      </td>
                      <td className="border-b border-border-muted px-3 py-4 text-sm text-text-muted">
                        {formatDateTime(item.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-muted pt-4">
            <p className="text-sm text-text-muted">
              Open an interview detail route to review raw context and jump to
              linked canonical questions.
            </p>
            <div className="flex flex-wrap gap-2">
              {previousHref ? (
                <Button href={previousHref}>Previous</Button>
              ) : (
                <Button disabled>Previous</Button>
              )}
              {nextHref ? (
                <Button href={nextHref}>Next</Button>
              ) : (
                <Button disabled>Next</Button>
              )}
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
