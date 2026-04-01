"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InterviewQuestionPromoteResponseData } from "@/lib/schemas/interview-questions";
import { formatCategoryLabel, formatTagLabel } from "@/lib/taxonomy-display";

type FeedbackState =
  | {
      tone: "success" | "error";
      message: string;
    }
  | undefined;

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type InterviewQuestionCardProps = {
  question: {
    id: string;
    sourceKind: "interview_question" | "legacy_question_link";
    questionText: string;
    sourceAnswer: string | null;
    category: string | null;
    sourceSnippet: string | null;
    tags: string[];
    promotedQuestions: Array<{
      questionItemId: string;
      questionText: string;
      category: string | null;
      tags: string[];
      linkType: "promoted_create" | "promoted_merge";
    }>;
    recommendedQuestions: Array<{
      id: string;
      questionText: string;
      category: string | null;
      sourceCount: number;
      tags: string[];
      score: number;
    }>;
  };
};

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!payload) {
    throw new Error("响应体不是合法 JSON。");
  }

  if (!payload.ok) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}

export function InterviewQuestionCard({ question }: InterviewQuestionCardProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [mergingQuestionId, setMergingQuestionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>();
  const hasPromotedQuestions = question.promotedQuestions.length > 0;
  const hasCreateLink = question.promotedQuestions.some(
    (promotedQuestion) => promotedQuestion.linkType === "promoted_create",
  );

  async function handleCreatePromotion() {
    setIsCreating(true);
    setFeedback(undefined);

    try {
      const response = await fetch(
        `/api/interview-questions/${question.id}/promote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create",
          }),
        },
      );
      const data = await readApiResponse<InterviewQuestionPromoteResponseData>(response);

      setFeedback({
        tone: "success",
        message: `已创建题库题 ${data.promotion.question_text}。`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "当前无法创建题库题。",
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleMergePromotion(targetQuestionId: string) {
    setMergingQuestionId(targetQuestionId);
    setFeedback(undefined);

    try {
      const response = await fetch(
        `/api/interview-questions/${question.id}/promote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "merge",
            target_question_id: targetQuestionId,
          }),
        },
      );
      const data = await readApiResponse<InterviewQuestionPromoteResponseData>(response);

      setFeedback({
        tone: "success",
        message: `已关联到题库题 ${data.promotion.question_text}。`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "当前无法关联到题库题。",
      });
    } finally {
      setMergingQuestionId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border-muted bg-surface-muted p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">
          {question.sourceKind === "interview_question" ? "面经原题" : "历史题库关联"}
        </Badge>
        {question.category ? (
          <Badge>{formatCategoryLabel(question.category) ?? question.category}</Badge>
        ) : null}
      </div>

      <div className="mt-3 text-sm font-semibold text-text-strong">
        {question.questionText}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {question.tags.map((tag) => (
          <Badge key={tag}>{formatTagLabel(tag) ?? tag}</Badge>
        ))}
      </div>

      {question.sourceAnswer ? (
        <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border-muted bg-white px-3 py-3 text-sm leading-6 text-text-strong">
          {question.sourceAnswer}
        </div>
      ) : null}

      {question.sourceSnippet ? (
        <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border-muted bg-white px-3 py-3 text-sm leading-6 text-text-muted">
          {question.sourceSnippet}
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`mt-3 rounded-lg border px-3 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-text-strong"
              : "border-amber-200 bg-amber-50 text-text-strong"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {question.promotedQuestions.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-text-strong">已沉淀到题库</p>
          <div className="space-y-2">
            {question.promotedQuestions.map((promotedQuestion) => (
              <div
                className="rounded-lg border border-border-muted bg-white px-3 py-3"
                key={`${promotedQuestion.questionItemId}-${promotedQuestion.linkType}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">{promotedQuestion.linkType}</Badge>
                  <Link
                    className="text-sm font-semibold text-text-strong hover:text-accent"
                    href={`/questions/${promotedQuestion.questionItemId}`}
                  >
                    {promotedQuestion.questionText}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {question.sourceKind === "legacy_question_link" ? (
        <div className="mt-4 rounded-lg border border-border-muted bg-white px-3 py-3 text-sm leading-6 text-text-muted">
          这是一条历史面经数据，题目曾直接写入题库；当前不支持继续在此卡片上执行新的沉淀动作。
        </div>
      ) : (
        <>
          {question.recommendedQuestions.length > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-text-strong">相关题库题</p>
              <div className="space-y-2">
                {question.recommendedQuestions.map((recommendedQuestion) => {
                  const alreadyPromoted = question.promotedQuestions.some(
                    (promotedQuestion) =>
                      promotedQuestion.questionItemId === recommendedQuestion.id,
                  );

                  return (
                    <div
                      className="rounded-lg border border-border-muted bg-white px-3 py-3"
                      key={recommendedQuestion.id}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="text-sm font-semibold text-text-strong hover:text-accent"
                          href={`/questions/${recommendedQuestion.id}`}
                        >
                          {recommendedQuestion.questionText}
                        </Link>
                        <Badge tone="accent">
                          匹配 {recommendedQuestion.score}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {recommendedQuestion.category ? (
                          <Badge>
                            {formatCategoryLabel(recommendedQuestion.category) ??
                              recommendedQuestion.category}
                          </Badge>
                        ) : null}
                        {recommendedQuestion.tags.map((tag) => (
                          <Badge key={tag}>{formatTagLabel(tag) ?? tag}</Badge>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Button href={`/questions/${recommendedQuestion.id}`}>
                          查看题库题
                        </Button>
                        <Button
                          disabled={alreadyPromoted || mergingQuestionId === recommendedQuestion.id}
                          onClick={() =>
                            handleMergePromotion(recommendedQuestion.id)
                          }
                          variant="primary"
                        >
                          {alreadyPromoted
                            ? "已关联"
                            : mergingQuestionId === recommendedQuestion.id
                              ? "关联中..."
                              : "合并到此题"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border-strong bg-white px-3 py-3 text-sm text-text-muted">
              当前没有检索到明显相关的题库题。
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {!hasPromotedQuestions && !hasCreateLink ? (
              <Button
                disabled={isCreating}
                onClick={handleCreatePromotion}
                variant="primary"
              >
                {isCreating ? "创建中..." : "沉淀为新题库题"}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
