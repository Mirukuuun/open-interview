import { Badge } from "@/components/ui/badge";
import {
  formatCategoryLabelOrFallback,
  formatTagLabel,
} from "@/lib/taxonomy-display";

type PracticeQuestionMetaProps = {
  category?: string | null;
  difficulty?: string | null;
  tags: string[];
};

export function PracticeQuestionMeta({
  category,
  difficulty,
  tags,
}: PracticeQuestionMetaProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone="accent">
        {formatCategoryLabelOrFallback(category, "未分类")}
      </Badge>
      {difficulty ? <Badge>{difficulty}</Badge> : null}
      {tags.slice(0, 3).map((tag) => (
        <Badge key={tag}>{formatTagLabel(tag) ?? tag}</Badge>
      ))}
    </div>
  );
}
