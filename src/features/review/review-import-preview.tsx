import { EmptyList } from "@/components/workbench/empty-list";
import { FormField } from "@/components/workbench/form-field";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatCategoryLabel, formatTagLabels } from "@/lib/taxonomy-display";
import type { ReviewJobDetail } from "@/server/services/parse-review-service";

type ReviewImportPreviewProps = {
  activeCandidate?:
    | {
        questionText: string;
        canonicalAnswer: string;
        category: string;
        tags: string;
        action: "create" | "merge" | "skip";
      }
    | undefined;
  activeMergeTarget: ReviewJobDetail["mergeTargets"][number] | undefined;
  canImport: boolean;
};

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，]/u)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function formatLocalizedTagSummary(tags: string[]) {
  if (tags.length === 0) {
    return "无";
  }

  return formatTagLabels(tags).join(", ");
}

export function ReviewImportPreview({
  activeCandidate,
  activeMergeTarget,
  canImport,
}: ReviewImportPreviewProps) {
  if (!canImport) {
    return <EmptyList title="当前类型仅支持查看，不支持确认写入" />;
  }

  if (!activeCandidate) {
    return <EmptyList title="暂无候选题预览" />;
  }

  if (activeCandidate.action === "merge") {
    if (!activeMergeTarget) {
      return <EmptyList title="未找到合并目标预览" />;
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">合并目标</Badge>
          <Badge>{activeMergeTarget.reviewStatus}</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-text-strong">
            {activeMergeTarget.questionText}
          </p>
          <p className="font-mono text-xs text-text-muted">{activeMergeTarget.id}</p>
          <p className="text-xs leading-5 text-text-muted">
            这是现有 canonical 题目的正式 ID；当前正式主键前缀就是 q_。
          </p>
        </div>
        <div className="rounded-xl border border-border-muted bg-surface-muted p-4 text-sm text-text-muted">
          <p>分类: {formatCategoryLabel(activeMergeTarget.category) ?? "未设置"}</p>
          <p className="mt-2">来源数: {activeMergeTarget.sourceCount}</p>
          <p className="mt-2">标签: {formatLocalizedTagSummary(activeMergeTarget.tags)}</p>
        </div>
        <FormField label="当前标准答案">
          <Textarea readOnly value={activeMergeTarget.canonicalAnswer ?? ""} />
        </FormField>
      </div>
    );
  }

  if (activeCandidate.action === "skip") {
    return <EmptyList title="当前候选题不会导入" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">新建预览</Badge>
      </div>
      <div className="rounded-xl border border-border-muted bg-surface-muted p-4">
        <p className="text-sm font-semibold text-text-strong">
          {activeCandidate.questionText || "未填写题目"}
        </p>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          分类: {formatCategoryLabel(activeCandidate.category) ?? "未设置"}
        </p>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          标签: {formatLocalizedTagSummary(parseTags(activeCandidate.tags))}
        </p>
      </div>
      <FormField label="标准答案预览">
        <Textarea readOnly value={activeCandidate.canonicalAnswer} />
      </FormField>
    </div>
  );
}
