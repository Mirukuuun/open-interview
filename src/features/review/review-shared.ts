import type {
  ParseJobStatus,
  ParseJobSummary,
} from "@/lib/schemas/parse-jobs";
import { formatDateTimeLabel } from "@/lib/date-time";
import type { SourceDocumentRecord } from "@/server/repositories/source-document-repository";

export function formatTimestamp(timestamp: string | null | undefined) {
  return formatDateTimeLabel(timestamp, "未开始");
}

export function parseJobStatusMeta(status: ParseJobStatus): {
  label: string;
  tone: "accent" | "warning" | "success" | "neutral";
} {
  switch (status) {
    case "pending":
      return { label: "待执行", tone: "accent" };
    case "running":
      return { label: "执行中", tone: "warning" };
    case "success":
      return { label: "已完成", tone: "success" };
    case "failed":
      return { label: "失败", tone: "warning" };
    case "needs_review":
      return { label: "待人工确认", tone: "warning" };
    case "confirmed":
      return { label: "已确认", tone: "success" };
    default:
      return { label: status, tone: "neutral" };
  }
}

export function sourceParseStatusMeta(
  parseStatus: SourceDocumentRecord["parseStatus"],
): {
  label: string;
  tone: "accent" | "warning" | "success" | "neutral";
} {
  switch (parseStatus) {
    case "not_started":
      return { label: "未开始", tone: "accent" };
    case "pending":
      return { label: "待执行", tone: "accent" };
    case "running":
      return { label: "执行中", tone: "warning" };
    case "needs_review":
      return { label: "待确认", tone: "warning" };
    case "confirmed":
      return { label: "已确认", tone: "success" };
    case "failed":
      return { label: "失败", tone: "warning" };
    default:
      return { label: parseStatus, tone: "neutral" };
  }
}

export function sourceKindLabel(kind: SourceDocumentRecord["kind"]) {
  switch (kind) {
    case "interview_experience":
      return "面经";
    case "knowledge_note":
      return "知识笔记";
    case "resume":
      return "简历";
    case "manual_input":
      return "手工录入";
    default:
      return kind;
  }
}

export function jobTypeLabel(jobType: ParseJobSummary["job_type"]) {
  switch (jobType) {
    case "extract_interview":
      return "提取面经";
    case "extract_resume":
      return "提取简历";
    case "normalize_manual_input":
      return "规范化手工输入";
    default:
      return jobType;
  }
}
