# Open Interview Workbench Feature

- doc_type: context_l2
- updated_at: 2026-04-02

## Manifest

- 路由：全局 workbench shell
- 主要目录：`src/app/(workbench)`、`src/features/workbench`、`src/components/workbench`
- 关联文档：`docs/ui-flows.md`

## Data Flow

1. 顶层 layout 装配全局壳层，并读取 workspace summary 供首页分流和导航 badge 复用。
2. 左侧导航根据当前路由高亮业务入口，并在有 `needs_review` 时为审核队列显示 badge；一级导航使用统一 icon 语义提升模块辨识度。
3. 题库、随机练习、QA、简历等 feature 共享统一壳层，但各自保留明确的页面身份与动作区。
4. 各 feature 页面复用 page header、section heading、table/empty state 组件。

## Business Rules

- 产品是 workbench-first，不是 chat-first。
- 业务关键动作不能只放在 top bar。
- 需要为 badge、空态和主要导航动作保留清晰位置。
- 一级导航需要保持图标、badge、focus-visible 反馈和 active 态的一致性，不能退化成仅文字列表。
- 根路由在空库时落到 `/import`，已有题库数据时默认落到 `/questions`。
- 随机练习作为题库后的高频使用面，应在一级导航中直接可见，不能埋在题库二级入口里。
- 页面头部优先展示模块身份、标题和动作，不再额外暴露路由路径文案。
