# Handoff H1 · planning-phase (m2-feature-pages)

**派发时间**：2026-04-15 18:05
**状态**：completed
**派发关系**：主 Agent → planning-phase SubAgent
**关联**：需求根 H1-planning-roadmap（completed）；m1-infra phase 已 closing（见 `m1-infra/handoffs/H12-closing-phase.md`）

## 任务上下文（dev-workflow 注入，SubAgent 必读 + 严格遵守）

- **project_root**：`/root/.openclaw/projects/open-interview`
- **workstream_type**：`feature`
- **workstream_id**：`001-webui-refactor`
- **git_branch**：`feature/001-webui-refactor`
- **docs_dir**：`docs/001-webui-refactor/`
- **complexity**：`L2`
- **phase_dir**：`docs/001-webui-refactor/m2-feature-pages/`
- **work_dir**：`docs/001-webui-refactor/m2-feature-pages/`

**约束**：所有产物必须写在 `work_dir` 内（即 `docs/001-webui-refactor/m2-feature-pages/` 下），**不得**写到需求根（那是 roadmap / design 的领地）或 `m1-infra/` 子目录（已 closing）。

## 任务描述

为 L2 需求 `001-webui-refactor` 的第二个 phase `m2-feature-pages` 产出详细的 phase plan 和 task 拆分。phase 的目标、范围、优先级顺序、验收条件已在 `roadmap.md §5` 敲定，本次任务是把它展开成**可派发给 implementer 的 task 级别**。

**phase 身份**：

- 代号：`m2-feature-pages`
- 主题：7 个 feature 页面逐页重构（practice / qa / questions / review / interviews / import / resume）
- 估算：7–14 天（单页 1–2 天 × 7 页）
- 前置依赖：`m1-infra` 已完成并合入本 feature 分支（已满足）
- 交付方式：每页独立 PR（可独立合并），按 P1→P7 优先级顺序推进

**roadmap 已敲定的关键约束**（必须遵守，不重新讨论）：

- **优先级顺序固定**：P1 `/practice` → P2 `/qa` → P3 `/questions` → P4 `/review` → P5 `/interviews` → P6 `/import` → P7 `/resume`（见 `roadmap.md §5.2` 表格 + `design.md §9` 表格）
- **每页启动时产物**：一份**轻量 design note**（一页 markdown，不走完整 design.md 流程），列出该页特定的布局调整、按钮摆放、空态方案
- **每页只动自己目录**：`src/features/<page>/*`；碰到 Shell / 原子组件 / tokens 改动必须先开 m1-infra 补丁 PR，不扩大 M2 范围
- **不纳入**：
  - 全局 tokens / 原子组件 / Shell 层变更（m1-infra 领地；m2 只消费不修改）
  - 任何业务逻辑 / API / `src/server/*` 变更
  - 非本工作流列入的新 feature 页面
- **task-type 豁免**（对齐 `roadmap.md §5.6`）：
  - **测试 task 类**：以"视觉 diff 自查 + 动作/路由对等自测清单"替代单元测试（无新逻辑路径需要单测）；若页面重构中发现业务 bug，走独立 bugfix 工作流，不混入本 phase
  - **部署/发布 task 类**：每页独立 PR 即交付物；无额外部署步骤（沿用主干 `deploy:mvp`，由主 Agent 在整体收口时触发）
- **M2 已知清理项**（`m1-infra/changelog.md` 偏差段登记的"已知取舍"，M2 逐页一次性清除）：
  - `.interactive-card` hover 10 处（qa 5 处 + resume 5 处）
  - `.reveal-list` 5 处（qa 3 处 + import 1 处 + practice 1 处）
  - `radar-draw` 1 处（practice）
  - 旧 token 类名（如 `border-border-strong`）430 处 / 37 文件
  - `PageHeader.eyebrow` / `SurfaceCard.interactive` 调用点（至少 `qa-workbench.tsx:57` 传 `eyebrow` 被静默忽略，需删调用）
- **整体收口项**（所有 7 页合并后做，不在本次 planning 中详细拆分）：
  - `AGENTS.md` 同步
  - `docs/reference/ui-flows.md` 同步（若含 UI 描述）
  - 新 tokens / 组件规范入口索引补齐

**必读文件**（按优先级）：

1. `docs/001-webui-refactor/roadmap.md` §5（M2 · m2-feature-pages 完整定义：目标 / 范围 / 里程碑 / 验收 / Risks / task-type 豁免）
2. `docs/001-webui-refactor/design.md` §9（Feature 页面重构优先级和重构方向）§11.2（Phase 2 验收）§12（未决事项——需在对应页面 design note 内闭环）
3. `docs/001-webui-refactor/m1-infra/changelog.md`（M2 可用的基础设施清单 + 偏差/已知清理项）
4. `docs/001-webui-refactor/m1-infra/report.md`（M1 完成报告，含 7 页在 M1 后的静态渲染状态）
5. 现有代码（用于识别每页需要改的具体文件清单）：
   - `src/features/practice/*`
   - `src/features/qa/*`
   - `src/features/questions/*`
   - `src/features/review/*`
   - `src/features/interviews/*`
   - `src/features/import/*`
   - `src/features/resume/*`

## 必读 skills

- `planning-phase` — phase 级 plan + task 文件产出的正式 skill，按它规定的结构（main plan + tasks/TX.Y-*.md）和 4 大 task 类别覆盖要求输出

SubAgent 用 Skill 工具加载这个 skill 后再开始写 plan + tasks。

## 期望输出

**落盘文件**（必须在 `work_dir` 内）：

- `docs/001-webui-refactor/m2-feature-pages/plan.md` — 主 plan（task 索引 + 依赖图 + 执行顺序 + phase 验收映射）
- `docs/001-webui-refactor/m2-feature-pages/tasks/TX.Y-<slug>.md` — 每个 task 一个文件

**结构建议**（SubAgent 可微调，只要满足 `planning-phase` skill 要求 + 本 handoff 验收标准）：

本 phase 的特殊性：**7 页独立 PR**，因此 tasks 有两种合理组织方式，二选一即可：

- **方式 A（推荐）**：每页一个"主 implementer task"（如 `T2.1-practice-page.md`），在该 task 文件内包含"轻量 design note（目标 + 布局骨架 + 按钮摆放 + 空态）"+"实现步骤（Step 1-N）"+"验收条件（视觉 diff + 动作对等自测清单）"。全 phase 约 7-10 个 task 文件（7 页 + 收口 + 可能的 buffer）
- **方式 B**：每页拆 2 个 task（`T2.1a-practice-design-note.md` 产出 design note，`T2.1b-practice-implement.md` 实现），共 14-16 个 task 文件

SubAgent 自行判断 A/B 哪个更清晰；如果页面复杂度差异大（如 `/resume` 可能需要独立小 design doc，见 `roadmap.md §5.5` R4 风险），可局部混用。

**task 拆分建议参考**（不强制，SubAgent 定最终粒度）：

- **P1 `/practice`**（灯塔页，优先暴露 M1 组件缺口）——三段布局：顶部总览主卡 + 主舞台 + 右侧最近考试；处理雷达图（`radar-draw` 已砍，这里是去装饰动画后是否留静态雷达图 / 换能力画像呈现的设计决策）
- **P2 `/qa`**——聊天气泡 + 左侧会话抽屉；在 design note 内闭环"气泡形态单列 vs 左右 / 引用 snippet inline 与否"（`design.md §12` 未决）
- **P3 `/questions`**——保留 Header + filter + list 骨架，按新密度 / 组件重绘
- **P4 `/review`**——同 P3 模式
- **P5 `/interviews`**——左侧来源列表 + 右侧上下文
- **P6 `/import`**——表单主导，step 2 分步感，多个 action panel 收敛
- **P7 `/resume`**——留到最后，结构可能最动；启动前独立判定是否升级为小 design doc
- **收口 task**（必须）：`AGENTS.md` 同步 + `docs/reference/ui-flows.md` 同步 + 新 design-system 入口索引补齐（整体收口项，在 P7 合入后做）
- **buffer task**（可选）：应对 P1 可能发现的 M1 组件缺口（需要 m1-infra 补丁 PR 的场景）

**4 大 task 类别覆盖**（`planning-phase` skill 要求）：

- **development**：P1-P7 的 7 个页面实现（以及每页的 design note，不论方式 A 或 B）
- **testing**：因 task-type 豁免（roadmap §5.6），用"视觉 diff 自查 + 动作对等自测清单"替代单元测试；此类 task 至少含一个总括性的"整体回归自测 + AGENTS.md 同步"task，或者分摊到每个页面 task 的验收段
- **delivery**：整体收口 task（AGENTS.md / ui-flows / design-system 索引同步）
- **buffer**：可选，默认 1 个以应对 M1 组件缺口补丁场景

**依赖图**：

- **强依赖**：P1 → P2 → P3 → P4 → P5 → P6 → P7（顺序执行，灯塔页 P1 先跑暴露缺口）
- **softer dependency**：除 P1 外可并行（但 roadmap 倾向顺序，以降低 Shell 层 merge conflict 风险；SubAgent 保留顺序即可）
- **收口 task**：依赖 P1-P7 全部完成

**所有产物文件末尾必须追加 completion marker**：

```
<!-- handoff: H1 · status: complete · timestamp: YYYY-MM-DD HH:MM -->
```

（注意这是 m2-feature-pages phase 内部的 H1，和需求根的 H1-planning-roadmap、m1-infra 的 H1-planning-phase 属于不同目录，编号独立。）

**回报格式**：

- `status`: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`
- `summary`: 一句话
- `产物路径`: 绝对路径列表（plan.md + 所有 tasks/TX.Y-*.md）
- `concerns`（如有）

## 验收标准

- [ ] 产出 `docs/001-webui-refactor/m2-feature-pages/plan.md`
- [ ] plan.md 含 task 索引（编号 + slug + 类别 + 依赖 + 状态复选框 `- [ ]`）和依赖图（或显式执行顺序）
- [ ] 产出 `docs/001-webui-refactor/m2-feature-pages/tasks/TX.Y-*.md` 多个（SubAgent 自行决定粒度，但数量合理；按上文方式 A 大约 8-10 个，方式 B 大约 15-17 个）
- [ ] task 集合覆盖 `planning-phase` skill 的 4 大类别（development / testing / delivery / buffer）
- [ ] 覆盖 `roadmap.md §5.2` 纳入项：P1-P7 全部 7 页（每页对应至少 1 个 development task 含轻量 design note）+ 整体收口（AGENTS.md + ui-flows + design-system 索引）
- [ ] testing 类通过 task-type 豁免声明（见任务描述），用"视觉 diff + 动作对等自测清单"的方式落到验收条件里，不生造单元测试 task
- [ ] 每个 task 文件含：目标 / 涉及文件 / 验收条件 / 依赖 / 估算 / 轻量 design note（每页 task 含）
- [ ] 优先级顺序 P1→P7 的强依赖在 plan.md 依赖图中明示
- [ ] M2 已知清理项（`.interactive-card` / `.reveal-list` / `radar-draw` / 旧 token 类名 / `PageHeader.eyebrow` / `SurfaceCard.interactive` 废 props 调用点）分摊到对应页面的 task 里或独立列入
- [ ] plan.md 和所有 tasks 文件末尾都有 completion marker（本 phase 内部 `handoff: H1 · status: complete · timestamp: ...`）
- [ ] git branch 仍是 `feature/001-webui-refactor`
- [ ] 不提交（commit 由主 Agent 在 review 后统一做）
- [ ] 不修改任何 `src/*` 源代码（planning 阶段只写文档，不碰代码）

---

## 执行记录

- **DONE 时间**：2026-04-16 10:25
- **SubAgent 回报 status**：DONE
- **产物路径**：
  - `docs/001-webui-refactor/m2-feature-pages/plan.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.1-practice-page.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.2-qa-page.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.3-questions-page.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.4-review-page.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.5-interviews-page.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.6-import-page.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.7-resume-page.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.8-regression-verification.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.9-delivery-closing.md`
  - `docs/001-webui-refactor/m2-feature-pages/tasks/T2.10-buffer.md`
- **主 Agent review**：通过（13/13 验收标准 ✓）
  - plan.md 完整（10 task 索引 + 依赖图 + 10 执行批次 + 8 风险 + Phase 验收）
  - 10 task 文件格式统一、粒度合理（方式 A：每页一个主 task 含内嵌 design note）
  - 4 大类别覆盖（development T2.1-T2.7 / testing T2.8 / delivery T2.9 / buffer T2.10）
  - roadmap §5.2 纳入项全部映射：P1-P7 全 7 页 + 收口
  - M1 已知清理项精确分摊到各页 task（interactive-card 5+5 / reveal-list 1+3+1 / radar-draw 1 / eyebrow 1 / radial-gradient 1 / 旧 token 430 处按 grep 计数分配）
  - design.md §12 未决闭环：T2.1 闭环雷达图决策 / T2.2 闭环气泡形态决策
  - T2.7 保留 roadmap §5.5 R4 风险决策点（启动前判定是否升级 design doc）
  - 12/12 文件有 completion marker
  - 没有源代码修改、没有 commit
- **最终 status**：completed
