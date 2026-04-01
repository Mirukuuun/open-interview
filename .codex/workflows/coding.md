# Open Interview 编码 Workflow

- doc_type: workflow
- applies_to: coding
- doc_root: `.codex`
- updated_at: 2026-04-01

## 前置读取

1. `AGENTS.md`
2. `.codex/context/open-interview-overview.md`
3. 对应模块的 L2 feature 文档
4. 目标源码与测试文件
5. 按需读取 `.codex/rules/*.md`

## Plan 记录

1. 每次任务开始前，都必须在 `docs/plans/[task]-plan.md` 创建或更新对应 Plan 文档；不再以“是否复杂”作为是否建 Plan 的判断条件。
2. 若 `docs/plans/` 不存在，先创建目录，再写入本次任务的 Plan 文档。
3. Plan 文档用于维护本次任务涉及的所有计划项、执行项和补充项，任务项统一使用以下格式逐行记录：

```text
[ ] task1. xxxxxxxxxxx
[ ] task2. xxxxxxxxxxx
[X] task3. xxxxxxxxxxx
```

4. 约束如下：
   - `[ ]` 表示未完成，`[X]` 表示已完成。
   - 每完成一项任务，必须立即把对应行从 `[ ]` 更新为 `[X]`，不能等到任务结束后一次性回填。
   - 任务过程中新增工作项时，继续追加新的 `taskN.` 行，并保持编号连续。
   - Plan 至少覆盖：文档读取、实现 / 改动、测试或 smoke 验证、L2 文档回环、同构检查；若任务涉及部署，还要显式写入 `commit` / `push`、部署与回归验证项。
   - 断点继续时，先读取对应 Plan 文档，再基于当前勾选状态恢复执行。

## 标准流程

1. 按“前置读取”完成文档与上下文读取，并先创建 / 更新 `docs/plans/[task]-plan.md`。
2. 按 L1 -> L2 -> L3 导航定位目标模块和代码入口。
3. 修改代码时遵守：
   - 路由层保持精简，业务逻辑下沉到 `src/server/services/*`
   - 输入输出校验停留在 `src/lib/schemas/*`
   - 客户端组件不直接承担数据库或服务逻辑
4. 触达核心文件时同步维护结构化注释与 `@feature`：
   - Service
   - Validator
   - Strategy
   - Domain
   - 其他承担核心业务职责的入口文件
5. 同步更新：
   - 对应测试或 smoke 脚本
   - `@feature` 指向的 L2 文档
   - 必要的 L1 文档索引
6. 编码过程中持续维护 Plan 文档：
   - 开始某项工作前，确认该项已写入 Plan。
   - 完成某项工作后，立即更新对应状态。
   - 若范围发生变化，先更新 Plan，再继续编码。
7. 完成后手动执行同构/契约检查：
   - `python3 .catpaw/scripts/check_isomorphism.py --check`
8. 若本次改动涉及交付门槛，再执行 `AGENTS.md` 约定的 `db:init`、`typecheck`、`lint`、`build`。
9. 当所有测试、smoke 与人工验收完成后，直接在当前分支执行 `commit` 与 `push`，确保待部署内容已经进入远端分支。
10. 本仓库当前默认交付到 `career.mimiruku.cn`，完成当前分支的 `commit` / `push` 后还要执行 `corepack pnpm deploy:mvp`，把部署纳入 coding loop。
11. 部署后至少回归验证：
   - `https://career.mimiruku.cn/import`
   - `https://career.mimiruku.cn/qa`
   - `https://career.mimiruku.cn/api/health`
12. 结束任务前，确认 Plan 文档中的所有已完成事项都已标记为 `[X]`，未完成项保留 `[ ]` 并能反映真实阻塞状态。

## 质量红线

- 单文件不超过 800 行。
- 单方法不超过 50 行。
- `if/for` 嵌套不超过 3 层。

## 文档回环

- L2 文档只维护 `Manifest / Data Flow / Business Rules`。
- 不在 L2 中复制实现细节或源码片段。
- 当 L3 行为变化时，优先更新 L2，再补 L1 索引。
- Plan 文档属于执行记录，统一维护在 `docs/plans/`，用于追溯任务状态与断点续做。
