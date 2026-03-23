import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

type QuestionDetailPlaceholderProps = {
  questionId: string;
};

export function QuestionDetailPlaceholder({
  questionId,
}: QuestionDetailPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/questions">Back to bank</Button>
            <Button variant="primary">Ask AI from this question</Button>
          </>
        }
        description="This direct-entry detail view will stand on its own once canonical data exists. The route is wired now so future slices can build without changing navigation structure."
        routeLabel={`/questions/${questionId}`}
        title="Question detail"
      />

      <DetailGrid
        items={[
          { label: "question_id", value: questionId },
          { label: "Sections", value: "Canonical answer, variants, sources, related" },
          { label: "Edit surface", value: "Deferred" },
          { label: "Source links", value: "Deferred" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <SurfaceCard className="space-y-5">
          <SectionHeading
            description="Canonical answer and answer variants will be the center of gravity on this page."
            title="Answer context"
          />
          <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-5 text-sm leading-6 text-text-muted">
            The canonical answer, personal variants, concise versions, and future
            follow-up answers will render here once the data layer lands.
          </div>
          <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-5 text-sm leading-6 text-text-muted">
            Related questions and linked source snippets will stay in the same
            route so direct links are useful during review.
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5" muted>
          <SectionHeading
            description="Question metadata stays visible while editing or starting AI review."
            title="Question metadata"
          />
          <div className="space-y-3 text-sm text-text-muted">
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Category placeholder
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Tags placeholder
            </div>
            <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
              Source count placeholder
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
