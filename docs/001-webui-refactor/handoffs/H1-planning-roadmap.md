# Handoff H1 · planning-roadmap

**派发时间**：2026-04-15 16:30
**状态**：completed
**派发关系**：主 Agent → planning-roadmap SubAgent
**关联**：H0 design.md（brainstorming 直接产出，无 handoff）

## 任务上下文（dev-workflow 注入，SubAgent 必读 + 严格遵守）

- **project_root**：`/root/.openclaw/projects/open-interview`
- **workstream_type**：`feature`
- **workstream_id**：`001-webui-refactor`
- **git_branch**：`feature/001-webui-refactor`
- **docs_dir**：`docs/001-webui-refactor/`
- **complexity**：`L2`
- **phase_dir**：（留空，roadmap 产物在需求根，尚未进入任何 phase）
- **work_dir**：`docs/001-webui-refactor/`

**约束**：所有产物必须写在 `work_dir` 内（即 `docs/001-webui-refactor/` 下），**不得**写到 `m1-*/` 或 `m2-*/` 子目录（那是 planning-phase 的领地）。

## 任务描述

把已完成的设计文档 `docs/001-webui-refactor/design.md` 展开成正式的 L2 roadmap。brainstorming 阶段已经和用户对齐了 phase 拆分策略（代号 "X 拆法 · 基础设施优先"），roadmap.md 需要把这个拆法**结构化、可追踪、可派生 phase plan**。

**brainstorming 已定的拆分约束**（必须遵守，不需要重新讨论）：

- **Phase 1 · `m1-infra`**：基础设施层。包含全站 design tokens（CSS 变量 + Tailwind theme）、所有原子 UI 组件重写（`src/components/ui/*`）、所有工作台原子组件重写（`src/components/workbench/*`）、Shell 层重构（`src/features/workbench/*` 及 root layout）、深色模式双态支持。**不动 feature 页面布局**；现有页面使用新组件自动"换皮"。Phase 1 必须能独立上线并通过合并门槛（`db:init + typecheck + lint + build`）。
- **Phase 2 · `m2-feature-pages`**：7 个 feature 页面逐页重构。优先级顺序已在 design.md §9 给出：practice / qa / questions / review / interviews / import / resume。每个页面在启动时补一份"轻量 design note"（不走完整 design.md 流程），单独交付可独立合并。

**拆分选择理由**：深色模式影响 tokens 和每个组件，如果先做页面再回头加深色，所有页面都要回归测试一遍，反而更费。基础设施优先可以让 Phase 2 的页面重构直接复用稳定的组件库。

**必读文件**：

- `docs/001-webui-refactor/design.md` — 完整设计决策，尤其 §4（范围）§7（原子组件清单）§8（Shell 层重构）§9（Feature 页面重构）§10（迁移策略）§11（验收标准）

不用读原项目代码，roadmap 产出只需基于 design.md 就够。

## 必读 skills

- `planning-roadmap` — L2 roadmap 文档产出的正式 skill，按它规定的结构和字段输出

SubAgent 用 Skill 工具加载这个 skill 后再开始写 roadmap.md。

## 期望输出

**落盘文件**（必须在 `work_dir` 内）：

- `docs/001-webui-refactor/roadmap.md` — L2 roadmap，包含 2 个 phase 的完整规划

roadmap.md 结构建议（以 `planning-roadmap` skill 规定的为准，以下仅为本需求的内容要点）：

- **frontmatter / 元信息**：doc_type / status / complexity=L2 / phases 索引
- **Phase 总览表**：至少 2 行（m1-infra, m2-feature-pages），每行含：phase 代号 / slug / 目标一句话 / 目录 / 前置依赖 / 状态复选框（`- [ ]`）
- **每个 phase 详细段**：目标、范围（纳入/不纳入）、前置依赖、关键里程碑、验收条件、risks
- **phase 间依赖图**：m1-infra → m2-feature-pages（m1 完成是 m2 开始的前置）

**文件末尾必须追加 completion marker**：

```
<!-- handoff: H1 · status: complete · timestamp: YYYY-MM-DD HH:MM -->
```

**回报格式**：

- `status`: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`
- `summary`: 一句话
- `产物路径`: 绝对路径列表
- `concerns`（如有）

## 验收标准

- [ ] 产出 `docs/001-webui-refactor/roadmap.md`（不是写在 m1/m2 子目录）
- [ ] roadmap.md 至少包含 2 个 phase：`m1-infra` 和 `m2-feature-pages`
- [ ] 每个 phase 有明确的：目标 / 范围 / 前置依赖 / 验收条件
- [ ] Phase 1 覆盖 design.md §5（全局规范）§6（按钮规范）§7（原子组件）§8（Shell）+ 深色模式；Phase 2 覆盖 §9（7 个 feature 页面）
- [ ] 两个 phase 的范围不重叠、不遗漏（design.md §4.1 所列"本次纳入"每项都落到某个 phase）
- [ ] 每个 phase 用 `- [ ]` 复选框形式标记状态（roadmap.md 顶部 phase 总览表 + 各段标题）
- [ ] phase 间依赖关系明确写出（m1 → m2）
- [ ] 文件末尾有 completion marker `<!-- handoff: H1 · status: complete · timestamp: ... -->`
- [ ] git branch 仍是 `feature/001-webui-refactor`（SubAgent 不得切分支）
- [ ] 不提交（commit 由主 Agent 在 review 后统一做）

---

## 执行记录

- **DONE 时间**：2026-04-15 16:45
- **SubAgent 回报 status**：DONE
- **产物路径**：
  - `docs/001-webui-refactor/roadmap.md`
- **SubAgent concerns**（已评估接受）：
  1. 只拆 2 phase 低于 `planning-roadmap` skill 的 3–7 phase 建议下限 —— 已在 roadmap §1 "规则豁免声明" 显式说明理由，接受
  2. 表格内 `- [ ]` 文本在 markdown 表格中不渲染为 checkbox —— 各 phase 段落下已有真 checkbox（§4 §5 每段首行），验收条件满足
- **主 Agent review**：通过（10/10 验收标准 ✓）
  - 目录正确（`docs/001-webui-refactor/roadmap.md`）
  - 2 phase（`m1-infra` + `m2-feature-pages`）结构完整
  - 每 phase 有目标 / 范围 / 里程碑 / 验收 / Risks 5 大块
  - design.md §4.1 纳入项全覆盖到某 phase，不重叠不遗漏
  - Phase 依赖图清晰（M1 → M2）
  - completion marker 存在
  - SubAgent 未 commit（按 handoff 要求，由主 Agent review 后统一提交）
- **最终 status**：completed
