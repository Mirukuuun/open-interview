# Open Interview 初始化 Workflow

- doc_type: workflow
- applies_to: repo_init
- doc_root: `.codex`
- updated_at: 2026-03-26

## 目标

- 建立 `.codex/workflows`、`.codex/context`、`.codex/rules`、`.codex/plans` 目录约定。
- 为仓库生成可用的 L1 文档，并按模块补齐首批 L2 契约文档。
- 启用 `.githooks/pre-commit` 与 `.catpaw/scripts/check_isomorphism.py --check`。
- 在不改动静态规则区块的前提下，只补充 `AGENTS.md` 的项目概要与 Context 索引。

## 输入

- `AGENTS.md`
- `README.md`
- `docs/tech-stack.md`
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
- `package.json`

## 步骤

1. 确认仓库根目录存在 `package.json`、`.git/`，并以 `.codex` 作为唯一规范目录。
2. 若 `.codex` 缺失，先补齐 workflow、context、rules、plans 的最小骨架。
3. 生成或更新以下 L1 文档：
   - `open-interview-overview.md`
   - `open-interview-architecture.md`
   - `open-interview-domain.md`
   - `open-interview-dependencies.md`
4. 根据现有模块边界补齐首批 L2 feature 文档，至少覆盖 workbench shell、import、review、questions、interviews、qa、resume、server core。
5. 仅在 `AGENTS.md` 中维护：
   - `## 项目概要`
   - `## Context 索引`
6. 创建 `.githooks/pre-commit`，并将默认同构检查脚本落在 `.catpaw/scripts/check_isomorphism.py`。
7. 执行：
   - `chmod +x .githooks/pre-commit`
   - `git config core.hooksPath .githooks`
   - `python3 .catpaw/scripts/check_isomorphism.py --check`

## 冲突处理

- 已有文档优先保留用户内容；新增信息以补充为主，不大段覆盖。
- 若 `AGENTS.md` 已存在项目概要或 Context 索引，仅更新这两个区块。
- 初始化阶段不改动业务代码，也不回退用户已有工作区改动。

## 完成定义

- `.codex` 目录结构齐全。
- L1 文档可用于后续 L1 -> L2 -> L3 导航。
- 首批 L2 文档能够覆盖当前主业务模块。
- `.githooks/pre-commit` 已启用。
- `python3 .catpaw/scripts/check_isomorphism.py --check` 通过。
