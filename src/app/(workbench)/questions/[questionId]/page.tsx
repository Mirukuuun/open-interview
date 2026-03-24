import { notFound } from "next/navigation";

import { QuestionDetailWorkbench } from "@/features/questions/question-detail-workbench";
import { questionBankService } from "@/server/services/question-bank-service";

type QuestionDetailPageProps = {
  params: Promise<{
    questionId: string;
  }>;
};

export default async function QuestionDetailPage({
  params,
}: QuestionDetailPageProps) {
  const { questionId } = await params;
  const question = questionBankService.getQuestionDetail(questionId);

  if (!question) {
    notFound();
  }

  return <QuestionDetailWorkbench question={question} />;
}
