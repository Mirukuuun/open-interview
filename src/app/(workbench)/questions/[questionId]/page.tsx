import { QuestionDetailPlaceholder } from "@/features/questions/question-detail-placeholder";

type QuestionDetailPageProps = {
  params: Promise<{
    questionId: string;
  }>;
};

export default async function QuestionDetailPage({
  params,
}: QuestionDetailPageProps) {
  const { questionId } = await params;

  return <QuestionDetailPlaceholder questionId={questionId} />;
}
