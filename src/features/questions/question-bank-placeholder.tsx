import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { PlaceholderTable } from "@/components/workbench/placeholder-table";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

export function QuestionBankPlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/questions/q_demo_cache_invalidation">Open sample detail</Button>
            <Button variant="primary">Start AI review</Button>
          </>
        }
        description="Question Bank is the long-term default surface once the system has data. Slice 0 only fixes the dense browsing layout and direct-entry route."
        routeLabel="/questions"
        title="Browse the canonical question bank"
      />

      <DetailGrid
        items={[
          { label: "Primary use", value: "Fast study and review" },
          { label: "Browse shape", value: "Filters + list + optional detail" },
          { label: "Search source", value: "Deferred to Slice 4" },
          { label: "Current state", value: "Empty bank" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <SurfaceCard className="space-y-4">
          <SectionHeading
            description="Filters stay visible while browsing so known questions can be located quickly."
            title="Filters"
          />
          <div className="grid gap-3">
            {[
              "Keyword",
              "Category",
              "Tag",
              "Difficulty",
              "Has personal answer",
              "Sort",
            ].map((filter) => (
              <div
                className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3 text-sm text-text-muted"
                key={filter}
              >
                {filter} placeholder
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="The bank should optimize for scan speed. Rows stay dense and factual."
            title="Question list"
          />
          <PlaceholderTable
            columns={[
              "question_text",
              "category",
              "tags",
              "source_count",
              "updated_at",
              "answer",
            ]}
            rows={[
              [
                "What breaks cache invalidation in distributed systems?",
                "distributed_system",
                "cache, consistency",
                "3",
                "2026-03-23T11:42:00Z",
                "canonical",
              ],
              [
                "Why should ThreadLocal be cleared in thread pools?",
                "java_concurrency",
                "threadlocal, cleanup",
                "5",
                "2026-03-23T10:18:00Z",
                "variant",
              ],
            ]}
          />
          <EmptyList
            bullets={[
              "Expose canonical answer, answer variants, sources, and related questions on detail routes.",
              "Keep direct entry to `/questions/:questionId` working independently of list state.",
              "Make AI review a next action, not the default page metaphor.",
            ]}
            description="The list is static in Slice 0. Search, detail loading, and mutations are intentionally deferred until the question bank slice."
            title="Canonical data not loaded yet"
          />
        </SurfaceCard>
      </div>
    </div>
  );
}
