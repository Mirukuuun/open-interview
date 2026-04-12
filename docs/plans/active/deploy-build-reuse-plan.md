[X] task1. 明确需求边界：优化 `next build` 主导的 deploy 耗时，优先减少重复构建，不改变正式服务的 runtime dist 隔离约定。
[X] task2. 阅读 AGENTS、coding workflow、dependencies context、历史 runtime dist 计划与现有 deploy/build 脚本，确认当前耗时主因和约束。
[X] task3. 检查当前工作区状态，确认存在未归属本任务的本地改动（`AGENTS.md`、`.claude/`），后续不回滚、不混入本次实现。
[X] task4. 实现 build metadata 与 deploy 构建产物复用逻辑：本地 `.next` 可复用时直接复制到 runtime stage，否则回退到原有 stage build。
[X] task5. 更新部署契约相关文档，记录 build 复用规则与回退路径。
[X] task6. 补充自动化测试，覆盖 build metadata 读写与可复用判定。
[X] task7. 执行同构检查、目标测试、`db:init`、`typecheck`、`lint`、`build`，并验证复用构建的本地启动链路。
[ ] task8. 执行 `git commit`、`git push`、`corepack pnpm deploy:mvp`，并回归验证 `/import`、`/qa`、`/api/health`。
[ ] task9. 复核工作区与 plan 状态，记录本次 deploy 优化结果与残留风险。
