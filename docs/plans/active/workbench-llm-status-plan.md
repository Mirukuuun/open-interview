[X] task1. 明确需求边界：将 workbench 顶栏右侧模型状态从写死占位改为真实提示，不改全局搜索。
[X] task2. 阅读 AGENTS、coding workflow、documentation/typescript/server rules、workbench/server-core L1-L2 context、health/api/ui-flows 与现有 top bar 实现，确认接线边界。
[X] task3. 检查当前工作区状态，确认存在未归属本任务的本地改动（`AGENTS.md`、`.claude/`），后续不回滚、不混入本次实现。
[X] task4. 实现 server-only LLM 状态探测与 health schema 扩展，并将真实状态接入 workbench top bar。
[X] task5. 更新 workbench/server-core L2 文档与 health API 契约文档，完成文档回环。
[X] task6. 补充或更新自动化测试，覆盖模型状态探测与 health payload 行为。
[X] task7. 执行 `python3 .catpaw/scripts/check_isomorphism.py --check`、`corepack pnpm db:init`、`corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm build`。
[ ] task8. 执行 `git commit`、`git push`、`corepack pnpm deploy:mvp`，并回归验证 `/import`、`/qa`、`/api/health`。
[ ] task9. 复核工作区与 plan 状态，记录本次实现结果与残留风险。
