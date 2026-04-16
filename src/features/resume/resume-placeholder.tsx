import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { PageHeader } from "@/components/workbench/page-header";
import { PlaceholderTable } from "@/components/workbench/placeholder-table";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

export function ResumePlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/resume/res_demo_candidate">Open sample resume</Button>
            <Button variant="primary">Upload resume</Button>
          </>
        }
        title="Resume ingestion and extracted projects"
      />

      <DetailGrid
        items={[
          { label: "Purpose", value: "Resume source and projects entry" },
          { label: "Sections", value: "Current resume state + project list" },
          { label: "Downstream flow", value: "Project deep dive" },
          { label: "Current data", value: "Placeholder only" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SurfaceCard className="space-y-5">
          <EmptyList
            bullets={[
              "Upload a resume source, trigger a parse job, and surface parse status.",
              "Keep the current resume summary visible near the project list.",
              "Avoid blending resume flow into the QA route; project deep dive has its own path.",
            ]}
            description="This panel will host the current resume source and parse controls once the resume slice lands."
            title="Resume source placeholder"
          />
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <PlaceholderTable
            columns={["project", "summary", "tech stack", "deep-dive", "sessions"]}
            rows={[
              [
                "Realtime Metrics Platform",
                "Streaming metrics aggregation and alerting",
                "Kafka, Flink, ClickHouse",
                "Ready",
                "2",
              ],
              [
                "Fraud Scoring Service",
                "Risk scoring pipeline for payments",
                "Java, Redis, MySQL",
                "Ready",
                "1",
              ],
            ]}
          />
          <p className="text-sm leading-6 text-[color:var(--color-muted-foreground)]">
            Project rows are static for bootstrap only. Slice 6 will connect them
            to parsed resume data and session history.
          </p>
        </SurfaceCard>
      </div>
    </div>
  );
}
