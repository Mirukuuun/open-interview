[X] task1. 明确需求边界：修复侧边栏导航项 hover 时背景与文字对比度不足的问题，不改整体导航信息架构。
[X] task2. 阅读 AGENTS、workflow、rules、workbench L1/L2 context、设计上下文与侧边栏实现，定位样式冲突来源。
[X] task3. 检查当前工作区状态，确认存在未归属本任务的本地改动，后续不回滚、不混入本次实现。
[X] task4. 调整 workbench 侧边栏导航项的 hover / active / focus-visible 样式，避免白底白字并保持折叠态一致。
[X] task5. 回环确认 L2 文档无需更新；本次仅修正现有导航项交互配色，不涉及 workbench 壳层行为契约变化。
[X] task6. 执行 `python3 .catpaw/scripts/check_isomorphism.py --check`。
[X] task7. 执行 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm build` 验证前端改动无回归。
[X] task8. 评估 `commit` / `push` / `deploy:mvp`：当前工作区存在多处未归属本任务的本地改动，直接提交或部署会混入非本次变更，因此本轮停留在本地已验证状态。
