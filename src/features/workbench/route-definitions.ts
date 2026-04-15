import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardCheck,
  FileText,
  MessageSquareQuote,
  Search,
  Upload,
  Zap,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  match: string;
  description: string;
  badge?: string;
  icon: LucideIcon;
  group: "data" | "learn";
};

export type NavigationSummary = {
  needsReviewCount: number;
};

export function buildPrimaryNavItems(summary?: NavigationSummary): NavItem[] {
  return [
    {
      label: "导入",
      href: "/import",
      icon: Upload,
      match: "/import",
      description: "导入原文或手工录入。",
      group: "data",
    },
    {
      label: "审核队列",
      href: "/review",
      icon: ClipboardCheck,
      match: "/review",
      description: "查看待处理的解析任务。",
      group: "data",
      badge:
        summary && summary.needsReviewCount > 0
          ? String(summary.needsReviewCount)
          : undefined,
    },
    {
      label: "题库",
      href: "/questions",
      icon: BookOpen,
      match: "/questions",
      description: "浏览确认后的题目。",
      group: "learn",
    },
    {
      label: "随机练习",
      href: "/practice",
      icon: Zap,
      match: "/practice",
      description: "随机刷题或完成 10 题模拟考试。",
      group: "learn",
    },
    {
      label: "面经",
      href: "/interviews",
      icon: MessageSquareQuote,
      match: "/interviews",
      description: "按来源查看面试上下文。",
      group: "learn",
    },
    {
      label: "AI 问答",
      href: "/qa",
      icon: Search,
      match: "/qa",
      description: "基于本地数据做引用式问答。",
      group: "learn",
    },
    {
      label: "简历 / 项目",
      href: "/resume",
      icon: FileText,
      match: "/resume",
      description: "查看简历和项目深挖。",
      group: "learn",
    },
  ];
}
