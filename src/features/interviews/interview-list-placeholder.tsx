import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { PlaceholderTable } from "@/components/workbench/placeholder-table";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

export function InterviewListPlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/interviews/int_demo_source">Open sample detail</Button>
            <Button variant="primary">Open source-oriented view</Button>
          </>
        }
        description="Interview Notes keeps the source-oriented browsing path separate from the canonical question bank. Slice 0 only reserves the route and list structure."
        routeLabel="/interviews"
        title="Browse interview experiences by source"
      />

      <DetailGrid
        items={[
          { label: "Purpose", value: "Source-oriented browsing" },
          { label: "List fields", value: "Company, role, round, summary, question count" },
          { label: "Filters", value: "Keyword, company, tag" },
          { label: "Current data", value: "Placeholder rows" },
        ]}
      />

      <SurfaceCard className="space-y-5">
        <PlaceholderTable
          columns={[
            "company",
            "role",
            "round_info",
            "summary",
            "question_count",
            "updated_at",
          ]}
          rows={[
            [
              "Meituan",
              "Backend engineer",
              "Round 1",
              "Middleware and concurrency focus",
              "8",
              "2026-03-23T11:10:00Z",
            ],
            [
              "ByteDance",
              "Data platform",
              "Round 2",
              "Storage tradeoffs and failure modes",
              "6",
              "2026-03-23T09:40:00Z",
            ],
          ]}
        />
        <EmptyList
          bullets={[
            "Interview detail routes should keep summary, linked questions, and raw context together.",
            "This view complements the question bank instead of replacing it.",
            "Search and filtering are deferred to Slice 4.",
          ]}
          description="The static rows demonstrate intended density and field layout without introducing persistence or business logic in the bootstrap slice."
          title="Source browse route is present"
        />
      </SurfaceCard>
    </div>
  );
}
