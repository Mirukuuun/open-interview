import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import { questionBankService } from "@/server/services/question-bank-service";

type QuestionDetailWorkbenchProps = {
  question: NonNullable<ReturnType<typeof questionBankService.getQuestionDetail>>;
};

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function renderTagList(tags: string[]) {
  if (tags.length === 0) {
    return <span className="text-sm text-text-muted">No tags</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag}>{tag}</Badge>
      ))}
    </div>
  );
}

export function QuestionDetailWorkbench({
  question,
}: QuestionDetailWorkbenchProps) {
  const primaryInterview = question.sources.find((source) => source.interviewExperience);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href="/questions">Back to bank</Button>
            {primaryInterview?.interviewExperience ? (
              <Button
                href={`/interviews/${primaryInterview.interviewExperience.id}`}
                variant="primary"
              >
                Open linked interview
              </Button>
            ) : (
              <Button href="/interviews" variant="primary">
                Browse interviews
              </Button>
            )}
          </>
        }
        description="Canonical answer, answer variants, and source links stay together so this route can stand alone for review and study."
        routeLabel={`/questions/${question.id}`}
        title={question.questionText}
      />

      <div className="flex flex-wrap gap-2">{renderTagList(question.tags)}</div>

      <DetailGrid
        items={[
          { label: "category", value: question.category ?? "unassigned" },
          { label: "difficulty", value: question.difficulty ?? "unset" },
          { label: "source_count", value: String(question.sourceCount) },
          { label: "updated_at", value: formatDateTime(question.updatedAt) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="The canonical answer is the default study anchor for this question."
              title="Canonical answer"
            />
            <div className="rounded-xl border border-border-muted bg-surface-muted p-4 text-sm leading-7 text-text-strong whitespace-pre-wrap">
              {question.canonicalAnswer ?? "No canonical answer saved yet."}
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="Variants stay visible so personal answers and concise versions can be compared quickly."
              title={`Answer variants (${question.answerVariants.length})`}
            />
            {question.answerVariants.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-muted">
                No answer variants saved yet.
              </div>
            ) : (
              <div className="space-y-3">
                {question.answerVariants.map((answerVariant) => (
                  <div
                    className="rounded-xl border border-border-muted bg-surface-muted p-4"
                    key={answerVariant.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{answerVariant.variantType}</Badge>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-strong">
                      {answerVariant.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="Related questions favor shared-source links first, then same-category fallback."
              title={`Related questions (${question.relatedQuestions.length})`}
            />
            {question.relatedQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-muted">
                No related questions were found from shared sources or the same
                category.
              </div>
            ) : (
              <div className="space-y-3">
                {question.relatedQuestions.map((relatedQuestion) => (
                  <div
                    className="rounded-xl border border-border-muted bg-surface-muted p-4"
                    key={relatedQuestion.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="text-sm font-semibold text-text-strong hover:text-accent"
                        href={`/questions/${relatedQuestion.id}`}
                      >
                        {relatedQuestion.questionText}
                      </Link>
                      {relatedQuestion.sharedSourceCount ? (
                        <Badge tone="success">
                          {relatedQuestion.sharedSourceCount} shared source
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {relatedQuestion.category ? (
                        <Badge>{relatedQuestion.category}</Badge>
                      ) : null}
                      {relatedQuestion.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4" muted>
            <SectionHeading
              description="Metadata stays visible while reviewing answers or jumping to source context."
              title="Metadata"
            />
            <div className="space-y-3 text-sm text-text-strong">
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                review_status: {question.reviewStatus}
              </div>
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                personal_answer: {question.hasPersonalAnswer ? "yes" : "no"}
              </div>
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                sources linked: {question.sources.length}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              description="Each linked source keeps the question grounded in review-confirmed study context."
              title={`Sources (${question.sources.length})`}
            />
            {question.sources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-muted">
                No sources are linked to this question yet.
              </div>
            ) : (
              <div className="space-y-3">
                {question.sources.map((source) => (
                  <div
                    className="rounded-xl border border-border-muted bg-surface-muted p-4"
                    key={`${source.sourceDocumentId}-${source.title}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-strong">
                        {source.title}
                      </h3>
                      <Badge>{source.kind}</Badge>
                    </div>
                    {source.interviewExperience ? (
                      <p className="mt-2 text-sm text-text-muted">
                        Interview:{" "}
                        <Link
                          className="font-medium text-accent hover:underline"
                          href={`/interviews/${source.interviewExperience.id}`}
                        >
                          {source.interviewExperience.company ?? "Unknown company"} /{" "}
                          {source.interviewExperience.role ?? "Unknown role"} /{" "}
                          {source.interviewExperience.roundInfo ?? "Unknown round"}
                        </Link>
                      </p>
                    ) : null}
                    {source.sourceSnippet ? (
                      <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border-muted bg-white px-3 py-3 text-sm leading-6 text-text-strong">
                        {source.sourceSnippet}
                      </div>
                    ) : null}
                    {source.sourceUrl ? (
                      <p className="mt-3 text-sm text-text-muted">
                        Source URL:{" "}
                        <Link
                          className="font-medium text-accent hover:underline"
                          href={source.sourceUrl}
                          target="_blank"
                        >
                          {source.sourceUrl}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
