import {
  getPracticeDimensionLabel,
  practiceDimensionKeySchema,
} from "@/lib/practice-dimensions";
import { PracticeWorkbench } from "@/features/practice/practice-workbench";
import { practiceService } from "@/server/services/practice-service";

type PracticePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const rawSearchParams = await searchParams;
  const dimensionResult = practiceDimensionKeySchema.safeParse(
    getSearchParamValue(rawSearchParams.dimension),
  );
  const activeDimension = dimensionResult.success
    ? {
        key: dimensionResult.data,
        label: getPracticeDimensionLabel(dimensionResult.data),
      }
    : null;
  const data = practiceService.getPracticePageData({
    dimension: activeDimension?.key,
  });

  return (
    <PracticeWorkbench
      activeDimension={activeDimension}
      practicePool={data.practicePool}
      practiceProfile={data.practiceProfile}
      recentExams={data.recentExams}
    />
  );
}
