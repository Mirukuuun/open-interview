# Plans 目录索引

本目录集中维护 coding loop 的执行记录。每份 plan 对应一次任务，内容规范见 [`.codex/plans/README.md`](../../.codex/plans/README.md) 与 [`.codex/workflows/coding.md`](../../.codex/workflows/coding.md)。

## 子目录约定

- [`active/`](./active)：存在 `[ ]` 未完成任务，或仍在被引用的 plan。新任务默认写入本目录，命名为 `active/[task]-plan.md`。
- [`closed/`](./closed)：全部任务均为 `[X]`，已完成并可随时查阅的历史 plan。任务收尾时从 `active/` 迁入。
- [`archived/`](./archived)：长期不再活跃、需要从日常视野中折叠的 plan。目前为空，按需从 `closed/` 迁入。

## 维护流程

1. 新任务启动 → 在 `active/` 创建 `[task]-plan.md`，至少覆盖 `.codex/plans/README.md` 中要求的最低范围。
2. 任务执行期间 → 持续把 `[ ]` 更新为 `[X]`，并保持 `taskN.` 编号连续。
3. 任务收尾 → 所有任务都勾选完毕后，`git mv` 到 `closed/`。
4. 长期封存 → `closed/` 中的 plan 若已对当前协作无参考价值，再 `git mv` 到 `archived/`。

## 当前 active 列表

- `active/deploy-build-reuse-plan.md`
- `active/extract-llm-prompts-plan.md`
- `active/milvus-recovery-closure-plan.md`
- `active/practice-workbench-visual-refresh-plan.md`
- `active/repo-hygiene-review-followup-plan.md`
- `active/workbench-llm-status-plan.md`

> 说明：除 `repo-hygiene-review-followup-plan.md` 外，其余 5 份的主体代码大多已 commit，残留 `[ ]` 主要落在 `commit` / `push` / `deploy:mvp` 收尾上；需要人工核对当前 HEAD 状态并决定是否整体关单，或补齐被显式暂缓的项（如 `extract-llm-prompts-plan.md` task8）。
