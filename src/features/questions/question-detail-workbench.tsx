import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { DetailGrid } from "@/components/workbench/detail-grid";
import { PageHeader } from "@/components/workbench/page-header";
import { SectionHeading } from "@/components/workbench/section-heading";
import type { ListQuestionsQuery } from "@/lib/schemas/questions";
import {
  buildQuestionDetailHref,
  buildQuestionsHref,
} from "@/features/questions/question-query-state";
import { formatCategoryLabel, formatTagLabel } from "@/lib/taxonomy-display";
import { questionBankService } from "@/server/services/question-bank-service";

type QuestionDetailWorkbenchProps = {
  filters: ListQuestionsQuery;
  navigation: ReturnType<typeof questionBankService.getQuestionNavigation>;
  question: NonNullable<ReturnType<typeof questionBankService.getQuestionDetail>>;
};

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function renderTagList(tags: string[]) {
  if (tags.length === 0) {
    return <span className="text-sm text-text-muted">无标签</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag}>{formatTagLabel(tag) ?? tag}</Badge>
      ))}
    </div>
  );
}

export function QuestionDetailWorkbench({
  filters,
  navigation,
  question,
}: QuestionDetailWorkbenchProps) {
  const primaryInterview = question.sources.find((source) => source.interviewExperience);
  const supplementalAnswerVariants = question.answerVariants.filter(
    (answerVariant) =>
      answerVariant.variantType !== "canonical" &&
      answerVariant.variantType !== "personal",
  );
  const listHref = buildQuestionsHref(filters);
  const previousHref = navigation.previous
    ? buildQuestionDetailHref(navigation.previous.id, {
        ...filters,
        page: navigation.previous.page,
      })
    : undefined;
  const nextHref = navigation.next
    ? buildQuestionDetailHref(navigation.next.id, {
        ...filters,
        page: navigation.next.page,
      })
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button href={listHref}>返回题库</Button>
            {previousHref ? <Button href={previousHref}>上一条</Button> : null}
            {nextHref ? <Button href={nextHref}>下一条</Button> : null}
            {primaryInterview?.interviewExperience ? (
              <Button
                href={`/interviews/${primaryInterview.interviewExperience.id}`}
                variant="primary"
              >
                打开关联面经
              </Button>
            ) : (
              <Button href="/interviews" variant="primary">
                查看面经
              </Button>
            )}
          </>
        }
        routeLabel={`/questions/${question.id}`}
        title={question.questionText}
      />

      <div className="flex flex-wrap gap-2">{renderTagList(question.tags)}</div>

      <DetailGrid
        items={[
          {
            label: "分类",
            value: formatCategoryLabel(question.category) ?? "未分配",
          },
          { label: "难度", value: question.difficulty ?? "未设置" },
          { label: "来源数", value: String(question.sourceCount) },
          { label: "更新时间", value: formatDateTime(question.updatedAt) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <SectionHeading title="答案" />
            <div className="rounded-xl border border-border-muted bg-surface-muted p-4 text-sm leading-7 text-text-strong whitespace-pre-wrap">
              {question.canonicalAnswer ?? "还没有答案。"}
            </div>
          </SurfaceCard>

          {supplementalAnswerVariants.length > 0 ? (
            <SurfaceCard className="space-y-4">
              <SectionHeading title={`补充视角（${supplementalAnswerVariants.length}）`} />
              <div className="space-y-3">
                {supplementalAnswerVariants.map((answerVariant) => (
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
            </SurfaceCard>
          ) : null}

          <SurfaceCard className="space-y-4">
            <SectionHeading
              title={`相关题目（${question.relatedQuestions.length}）`}
            />
            {question.relatedQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-muted">
                暂无相关题目。
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
                          共源 {relatedQuestion.sharedSourceCount}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {relatedQuestion.category ? (
                        <Badge>
                          {formatCategoryLabel(relatedQuestion.category) ??
                            relatedQuestion.category}
                        </Badge>
                      ) : null}
                      {relatedQuestion.tags.map((tag) => (
                        <Badge key={tag}>{formatTagLabel(tag) ?? tag}</Badge>
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
              title="元信息"
            />
            <div className="space-y-3 text-sm text-text-strong">
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                审核状态: {question.reviewStatus}
              </div>
              <div className="rounded-xl border border-border-strong bg-white px-4 py-3">
                关联来源: {question.sources.length}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              title={`来源面经题（${question.linkedInterviewQuestions.length}）`}
            />
            {question.linkedInterviewQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-muted">
                这道题目前没有手动沉淀的面经题来源。
              </div>
            ) : (
              <div className="space-y-3">
                {question.linkedInterviewQuestions.map((linkedQuestion) => (
                  <div
                    className="rounded-xl border border-border-muted bg-surface-muted p-4"
                    key={`${linkedQuestion.interviewQuestionId}-${linkedQuestion.linkType}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{linkedQuestion.linkType}</Badge>
                      <Link
                        className="text-sm font-semibold text-text-strong hover:text-accent"
                        href={`/interviews/${linkedQuestion.interviewExperience.id}`}
                      >
                        {linkedQuestion.interviewExperience.company ?? "未知公司"} /{" "}
                        {linkedQuestion.interviewExperience.role ?? "未知岗位"} /{" "}
                        {linkedQuestion.interviewExperience.roundInfo ?? "未知轮次"}
                      </Link>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-strong">
                      {linkedQuestion.questionText}
                    </div>
                    {linkedQuestion.sourceAnswer ? (
                      <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border-muted bg-white px-3 py-3 text-sm leading-6 text-text-strong">
                        {linkedQuestion.sourceAnswer}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <SectionHeading
              title={`来源（${question.sources.length}）`}
            />
            {question.sources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-muted">
                这道题还没有关联来源。
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
                        面经:{" "}
                        <Link
                          className="font-medium text-accent hover:underline"
                          href={`/interviews/${source.interviewExperience.id}`}
                        >
                          {source.interviewExperience.company ?? "未知公司"} /{" "}
                          {source.interviewExperience.role ?? "未知岗位"} /{" "}
                          {source.interviewExperience.roundInfo ?? "未知轮次"}
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
                        来源链接:{" "}
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
