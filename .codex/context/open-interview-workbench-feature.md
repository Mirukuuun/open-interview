# Open Interview Workbench Feature

- doc_type: context_l2
- updated_at: 2026-03-26

## Manifest

- 路由：全局 workbench shell
- 主要目录：`src/app/(workbench)`、`src/features/workbench`、`src/components/workbench`
- 关联文档：`docs/ui-flows.md`

## Data Flow

1. 顶层 layout 装配全局壳层。
2. 左侧导航根据当前路由高亮业务入口。
3. 各 feature 页面复用 page header、section heading、table/empty state 组件。

## Business Rules

- 产品是 workbench-first，不是 chat-first。
- 业务关键动作不能只放在 top bar。
- 需要为 badge、空态和工作台信息层保留清晰位置。
