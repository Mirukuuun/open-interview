[X] task1. 复核 coding workflow、Milvus 当前运行态、QA L2 文档与技术栈文档，确认根因为 Milvus standalone 容器退出且无自动重启策略。
[X] task2. 补齐仓库内的 Milvus 恢复入口，包括 compose 自动重启策略与可重复执行的 QA vector sync 命令。
[X] task3. 更新 QA / tech-stack 文档，明确 `pending` 状态、恢复路径与 backlog drain 约定。
[X] task4. 执行运行态收口：为现有 Milvus 容器设置 restart policy、确认 Milvus 健康，并清空 QA foundation backlog。
[X] task5. 执行同构检查、`db:init`、`typecheck`、`lint`、`build`，验证本次改动不破坏交付链路。
[ ] task6. 在当前分支执行 `commit` 与 `push`，确保 Milvus 收口改动进入远端。
[ ] task7. 执行 `corepack pnpm deploy:mvp` 并回归验证 `/qa`、`/api/health`，确认 `vector_backend.status` 收敛到 `ok`。
