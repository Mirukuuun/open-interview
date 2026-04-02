export type NavItem = {
  label: string;
  href: string;
  match: string;
  description: string;
  badge?: string;
};

export type NavigationSummary = {
  needsReviewCount: number;
};

export function buildPrimaryNavItems(summary?: NavigationSummary): NavItem[] {
  return [
    {
      label: "导入",
      href: "/import",
      match: "/import",
      description: "导入原文或手工录入。",
    },
    {
      label: "审核队列",
      href: "/review",
      match: "/review",
      description: "查看待处理的解析任务。",
      badge:
        summary && summary.needsReviewCount > 0
          ? String(summary.needsReviewCount)
          : undefined,
    },
    {
      label: "题库",
      href: "/questions",
      match: "/questions",
      description: "浏览确认后的题目。",
    },
    {
      label: "随机练习",
      href: "/practice",
      match: "/practice",
      description: "随机刷题或完成 10 题模拟考试。",
    },
    {
      label: "面经",
      href: "/interviews",
      match: "/interviews",
      description: "按来源查看面试上下文。",
    },
    {
      label: "AI 问答",
      href: "/qa",
      match: "/qa",
      description: "基于本地数据做引用式问答。",
    },
    {
      label: "简历 / 项目",
      href: "/resume",
      match: "/resume",
      description: "查看简历和项目深挖。",
    },
  ];
}
