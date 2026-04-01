import { Button } from "@/components/ui/button";

type ReviewConfirmDialogProps = {
  isInterviewSource: boolean;
  isConfirming: boolean;
  isOpen: boolean;
  visibleSummary: {
    create: number;
    merge: number;
    keep: number;
    skip: number;
  };
  onClose: () => void;
  onConfirm: () => void;
};

export function ReviewConfirmDialog({
  isInterviewSource,
  isConfirming,
  isOpen,
  visibleSummary,
  onClose,
  onConfirm,
}: ReviewConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div
        aria-describedby="confirm-import-description"
        aria-labelledby="confirm-import-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-border-strong bg-white p-6 shadow-xl"
        role="dialog"
      >
        <div className="space-y-3">
          <p
            className="text-base font-semibold text-text-strong"
            id="confirm-import-title"
          >
            {isInterviewSource
              ? "确认把当前审核结果写入面经与面经题？"
              : "确认把当前审核结果写入 canonical 题库？"}
          </p>
          <p
            className="text-sm leading-6 text-text-muted"
            id="confirm-import-description"
          >
            {isInterviewSource
              ? "确认后会把当前候选题写入面经题，并在面经详情页提供题库关联与手动沉淀入口。"
              : "确认后会提交当前候选题处理结果，并刷新页面到最新已确认状态。"}
          </p>
          <div className="rounded-xl border border-border-muted bg-surface-muted px-4 py-3 text-sm text-text-muted">
            {isInterviewSource ? (
              <>
                <p>保留 {visibleSummary.keep} 条</p>
                <p className="mt-1">跳过 {visibleSummary.skip} 条</p>
              </>
            ) : (
              <>
                <p>新建 {visibleSummary.create} 条</p>
                <p className="mt-1">合并 {visibleSummary.merge} 条</p>
                <p className="mt-1">跳过 {visibleSummary.skip} 条</p>
              </>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button disabled={isConfirming} onClick={onClose}>
            取消
          </Button>
          <Button disabled={isConfirming} onClick={onConfirm} variant="primary">
            {isConfirming
              ? isInterviewSource
                ? "保存中..."
                : "入库中..."
              : isInterviewSource
                ? "确认并保存"
                : "确认并入库"}
          </Button>
        </div>
      </div>
    </div>
  );
}
