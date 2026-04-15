import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { PlaceholderTable } from "@/components/workbench/placeholder-table";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

export function ReviewQueuePlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/review/job_demo_queue">Open sample review route</Button>
            <Button variant="primary">Retry selected</Button>
          </>
        }
        title="Review parse jobs before canonical import"
      />

      <DetailGrid
        items={[
          { label: "Target statuses", value: "pending, running, failed, needs_review" },
          { label: "Primary action", value: "Open review desk" },
          { label: "List shape", value: "Summary cards + filters + job table" },
          { label: "Current data", value: "None wired" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading title="Queue controls" />
          <div className="grid gap-3">
            {["Status filter", "Source kind filter", "Keyword filter"].map((label) => (
              <div
                className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3 text-sm text-text-muted"
                key={label}
              >
                {label} placeholder
              </div>
            ))}
          </div>
          <EmptyList
            bullets={[
              "Show failed and needs_review jobs without hiding them behind detail pages.",
              "Keep a one-click path into `/review/:jobId`.",
              "Support retry and source inspection without mixing in business logic here.",
            ]}
            description="The queue is intentionally static in Slice 0. Its job is to reserve layout and intent so Slice 3 can focus on wiring parse-job state."
            title="No parse jobs yet"
          />
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <SectionHeading title="Job list" />
          <PlaceholderTable
            columns={[
              "job_id",
              "source title",
              "job_type",
              "status",
              "created_at",
              "candidate count",
              "actions",
            ]}
            rows={[
              [
                "job_demo_queue",
                "Sample interview note",
                "extract_interview",
                "needs_review",
                "2026-03-23T11:00:00Z",
                "4",
                "Open review",
              ],
              [
                "job_demo_failed",
                "Resume import",
                "extract_resume",
                "failed",
                "2026-03-23T11:20:00Z",
                "0",
                "Retry",
              ],
            ]}
          />
        </SurfaceCard>
      </div>
    </div>
  );
}
