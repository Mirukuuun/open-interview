[X] task1. 明确需求边界：本次仅重新部署当前服务，不做代码、契约或文档修改。
[X] task2. 阅读 `AGENTS.md`、`.codex/workflows/coding.md`、`.codex/context/open-interview-overview.md`、`.codex/context/open-interview-dependencies.md` 与 `.codex/rules/documentation-loop.md`，确认本次按 Coding Loop 执行。
[X] task3. 检查部署前置条件：当前 `HEAD` 与 `origin/dev/mvp-delivery` 一致，本地 `.next` 构建元数据匹配当前 `HEAD`，`deploy:mvp` 可复用已提交构建且不会带入工作区未提交改动。
[X] task4. 评估 `commit` / `push` 要求：本次无新增交付改动，且当前分支已与远端对齐，因此不新增 `commit` / `push`，保留现有未提交改动不触碰。
[X] task5. 执行 `python3 .catpaw/scripts/check_isomorphism.py --check`。
[X] task6. 执行 `corepack pnpm deploy:mvp` 重新部署当前服务。
[X] task7. 回归验证 `/questions`、`/import`、`/qa`、`/api/health` 可达。
[X] task8. 更新 Plan 并记录部署结果。
