[X] task1. 阅读 AGENTS、coding workflow、相关 rules/context、设计文档并确认本次范围为全站工作台视觉收缩、practice 重构与导航收起。
[X] task2. 盘点 workbench 与 practice 现有实现，识别共享组件、导航、页面头部和 practice 结构的改动入口。
[X] task3. 收紧共享 PageHeader / SectionHeading / SurfaceCard 等视觉基线，并准备必要的全局过渡与工作台样式变量。
[X] task4. 清理全站 workbench 页面头部和区块解释型文案，保留必要状态、数据、动作、空态与错误提示。
[X] task5. 实现 workbench 左侧导航桌面端展开/收起、持久化、badge 简化和 tooltip 交互。
[X] task6. 重构 /practice 页面布局，移除固定左侧长摘要栏，建立顶部主卡、主舞台与最近考试新结构。
[X] task7. 将长期能力画像并入 /practice 顶部主卡，补齐完整态/紧凑态/最紧凑态三种展示。
[X] task8. 压缩最近考试、定向练习状态条和考试结果页首屏层级，保证主舞台聚焦。
[X] task9. 按质量红线拆分 practice 客户端实现，避免单文件和单方法继续膨胀。
[X] task10. 更新 `.codex/context/open-interview-practice-feature.md`、`.codex/context/open-interview-workbench-feature.md` 和必要的 `docs/ui-flows.md`。
[X] task11. 执行 `python3 .catpaw/scripts/check_isomorphism.py --check`、`corepack pnpm db:init`、`corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm build`。
[ ] task12. 检查变更后执行 `git commit`、`git push`、`corepack pnpm deploy:mvp`，并回归验证 `/import`、`/qa`、`/api/health`。
