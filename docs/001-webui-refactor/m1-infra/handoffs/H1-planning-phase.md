# Handoff H1 · planning-phase (m1-infra)

**派发时间**：2026-04-15 16:50
**状态**：completed
**派发关系**：主 Agent → planning-phase SubAgent
**关联**：需求根 H1-planning-roadmap（已 completed），本 phase 首个 handoff

## 任务上下文（dev-workflow 注入，SubAgent 必读 + 严格遵守）

- **project_root**：`/root/.openclaw/projects/open-interview`
- **workstream_type**：`feature`
- **workstream_id**：`001-webui-refactor`
- **git_branch**：`feature/001-webui-refactor`
- **docs_dir**：`docs/001-webui-refactor/`
- **complexity**：`L2`
- **phase_dir**：`docs/001-webui-refactor/m1-infra/`
- **work_dir**：`docs/001-webui-refactor/m1-infra/`

**约束**：所有产物必须写在 `work_dir` 内（即 `docs/001-webui-refactor/m1-infra/` 下），**不得**写到需求根（那是 roadmap / design 的领地）或 `m2-feature-pages/` 子目录。

## 任务描述

为 L2 需求 `001-webui-refactor` 的第一个 phase `m1-infra` 产出详细的 phase plan 和 task 拆分。m1-infra 的目标、范围、验收条件已经在 `roadmap.md §4` 中敲定，本次任务是把它展开成**可派发给 implementer 的 task 级别**。

**phase 身份**：

- 代号：`m1-infra`
- 主题：全站 design tokens + 原子组件重写 + Shell 层重构 + 深色模式双态支持
- 估算：4–5 天
- 前置依赖：无（design.md 已就绪）
- 独立可上线：是（Phase 2 不启动也能作为独立交付物）

**brainstorming 和 roadmap 已敲定的关键约束**（必须遵守，不重新讨论）：

- 不动任何 `src/features/{import,review,questions,practice,interviews,qa,resume}/*` feature 页面布局（M2 领地）
- 不动任何业务逻辑 / API / `src/server/*`
- 组件 props 尽量保留现有签名（`variant / href / children`），必要时新增 `size` 默认等价现有行为
- 深色模式通过 `.dark` 根类 + CSS 变量切换 + `localStorage.openInterviewTheme` 记忆
- 字体：移除 IBM Plex（`@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono`），新增 Inter，保留 JetBrains Mono
- 合并门槛：`corepack pnpm db:init + typecheck + lint + build` 全部通过

**必读文件**（按优先级）：

1. `docs/001-webui-refactor/roadmap.md` §4（M1 · m1-infra 的完整定义：目标 / 范围 / 里程碑 / 验收 / Risks）
2. `docs/001-webui-refactor/design.md` §5（全局规范）§6（按钮）§7（原子组件）§8（Shell）§10（迁移策略）§11.1（Phase 1 验收）
3. 现有代码（用于识别需要改写的具体文件清单和 props 兼容性影响面）：
   - `src/app/globals.css`
   - `src/app/layout.tsx`
   - `src/app/(workbench)/layout.tsx`
   - `src/components/ui/*.tsx`（button / badge / input / select / textarea / skeleton / surface-card）
   - `src/components/workbench/*.tsx`（page-header / section-heading / empty-list / detail-grid / form-field / placeholder-table）
   - `src/features/workbench/*.tsx`（shell / app-sidebar / top-bar / route-definitions）
   - `package.json`（字体依赖调整）
   - `components.json`（shadcn 配置，看是否需要调整）

## 必读 skills

- `planning-phase` — phase 级 plan + task 文件产出的正式 skill，按它规定的结构（main plan + tasks/TX.Y-*.md）和 4 大 task 类别覆盖要求输出

SubAgent 用 Skill 工具加载这个 skill 后再开始写 plan + tasks。

## 期望输出

**落盘文件**（必须在 `work_dir` 内）：

- `docs/001-webui-refactor/m1-infra/plan.md` — 主 plan（task 索引 + 依赖图 + 执行顺序）
- `docs/001-webui-refactor/m1-infra/tasks/TX.Y-<slug>.md` — 每个 task 一个文件（planning-phase skill 会规定 TX.Y 编号规则）

**task 拆分建议参考**（SubAgent 自己定最终粒度，这只是我对 phase 内部结构的理解）：

- **Tokens 层**（globals.css 完全重写 + Tailwind theme 配置）
- **深色模式基础设施**（.dark 根类切换、ThemeProvider、localStorage 记忆、主题切换按钮 theme-toggle.tsx）
- **原子 UI 组件重写**（按影响面排：button 最重、badge / input / select / textarea / skeleton 次之、Card 拆分子组件）
- **新增 UI 组件**（tooltip / dialog / separator）
- **工作台原子组件重写**（page-header 最重、section-heading / empty-list / detail-grid / form-field / placeholder-table 次之）
- **Shell 层重构**（sidebar 浅色化、topbar 瘦身、shell 容器调整、root layout 字体/主题）
- **字体依赖更新**（package.json 移除 IBM Plex、新增 Inter）
- **清理废弃资源**（radial gradient / reveal-list / interactive-card / fade-in-up / radar-draw / surface-nav）
- **跨组件回归验证**（typecheck / lint / build / 视觉 diff 自查 / 375px viewport 自查 / 深色模式切换自查）

不要求 SubAgent 严格按这个列表拆，但最终 task 集合应该覆盖到这些方面。

**所有产物文件末尾必须追加 completion marker**：

```
<!-- handoff: H1 · status: complete · timestamp: YYYY-MM-DD HH:MM -->
```

（注意这是 m1-infra phase 内部的 H1，和需求根的 H1-planning-roadmap 属于不同目录，编号独立。）

**回报格式**：

- `status`: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`
- `summary`: 一句话
- `产物路径`: 绝对路径列表（plan.md + 所有 tasks/TX.Y-*.md）
- `concerns`（如有）

## 验收标准

- [ ] 产出 `docs/001-webui-refactor/m1-infra/plan.md`
- [ ] plan.md 含 task 索引（编号 + slug + 类别 + 依赖 + 状态复选框）和依赖图（或显式的执行顺序）
- [ ] 产出 `docs/001-webui-refactor/m1-infra/tasks/TX.Y-*.md` 多个（SubAgent 自行决定粒度，但数量合理：过少无法细颗粒执行，过多冗余）
- [ ] task 集合满足 `planning-phase` skill 的 4 大类别强制覆盖
- [ ] 覆盖 roadmap.md §4.2 所列 M1 纳入项的每一条（tokens / 按钮 / 原子 UI / 新增组件 / 工作台组件 / Shell 4 文件 / 字体依赖 / 废弃资源清理）
- [ ] 每个 task 文件含：目标 / 涉及文件 / 验收条件 / 依赖 / 估算
- [ ] plan.md 和所有 tasks 文件末尾都有 completion marker（本 phase 内部 `handoff: H1 · status: complete · timestamp: ...`）
- [ ] git branch 仍是 `feature/001-webui-refactor`
- [ ] 不提交（commit 由主 Agent 在 review 后统一做）
- [ ] 不修改任何 `src/*` 源代码（planning 阶段只写文档，不碰代码）

---

## 执行记录

- **派发 SubAgent 时间**：2026-04-15 16:50
- **SubAgent 产出中断时间**：2026-04-15 ~17:00（5-hour usage limit 触发，外部中断非内部 BLOCKED）
- **SubAgent 部分产物**（11 个文件中 11 个有效）：
  - `plan.md`（完整，含 11 task 索引 + 依赖图 + 8 执行批次 + 7 全局风险 + Phase 验收）
  - `tasks/T1.1-tokens-globalcss-rewrite.md` 至 `tasks/T1.10-buffer.md`（10 个）
  - 缺：`tasks/T1.11-delivery-docs.md`
- **主 Agent 补全**：手工补写 `tasks/T1.11-delivery-docs.md`（delivery 类，按 T1.9 / T1.10 同格式），确保 plan.md 引用的 11 个 task 文件全部到位
- **主 Agent review**：通过（10/10 验收标准 ✓）
  - plan.md 4 大 task 类别覆盖完整（development T1.1-T1.8 / testing T1.9 / buffer T1.10 / delivery T1.11）
  - 所有 task 文件末尾有 completion marker（含主 Agent 补的 T1.11）
  - 依赖图和执行批次清晰
  - design.md §4.1 纳入项全部映射到某个 task
  - 没有源代码修改
- **最终 status**：completed
- **备注**：SubAgent 因 API limit 中断是外部原因；已产出的 10 个 task 质量很高（格式统一、粒度合理、验收条件具体、Step 1-5 TDD 流程模板完整）。不开 fix handoff 重派，视同 SubAgent DONE。
