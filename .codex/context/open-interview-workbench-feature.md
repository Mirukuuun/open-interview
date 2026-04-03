# Open Interview Workbench Feature

- doc_type: context_l2
- updated_at: 2026-04-03

## Manifest

- 路由：全局 workbench shell
- 主要目录：`src/app/(workbench)`、`src/features/workbench`、`src/components/workbench`
- 关联文档：`docs/ui-flows.md`

## Data Flow

1. 顶层 layout 装配全局壳层，并读取 workspace summary 供首页分流和导航 badge 复用。
2. 左侧导航根据当前路由高亮业务入口，并在有 `needs_review` 时为审核队列显示 badge；桌面端支持展开 / 收起两种宽度，并持久化用户上次选择。
3. 收起态只保留品牌缩写、导航图标、active 态、tooltip 和 badge 简化表达，主内容区随之释放横向空间。
4. 题库、随机练习、QA、简历等 feature 共享统一壳层，但各自保留明确的页面身份与动作区；页面头部默认只暴露标题、状态、统计和动作，不再承载说明性文案。
5. 各 feature 页面复用 page header、section heading、table/empty state 组件，并统一采用更轻的圆角、阴影和统计密度。

## Business Rules

- 产品是 workbench-first，不是 chat-first。
- 业务关键动作不能只放在 top bar。
- 需要为 badge、空态和主要导航动作保留清晰位置。
- 一级导航需要保持图标、badge、focus-visible 反馈和 active 态的一致性，不能退化成仅文字列表。
- 导航首次访问默认展开；只有用户手动切换后才持久化收起偏好。
- 根路由在空库时落到 `/import`，已有题库数据时默认落到 `/questions`。
- 随机练习作为题库后的高频使用面，应在一级导航中直接可见，不能埋在题库二级入口里。
- 页面头部优先展示模块身份、标题和动作，不再额外暴露路由路径文案。
