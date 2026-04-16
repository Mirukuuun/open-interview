# M2 · m2-feature-pages · 主 Plan

- doc_type: phase_plan
- status: proposed
- workstream: `001-webui-refactor`
- phase: `m2-feature-pages`
- complexity: L2
- updated_at: 2026-04-15
- git_branch: `feature/001-webui-refactor`
- work_dir: `docs/001-webui-refactor/m2-feature-pages/`

## Goal

在 M1 基础设施稳定之上，对 7 个 feature 页面逐页进行布局节奏重构，让不同主任务（考试 / 对话 / 题库 / 面经 / 上传 / 简历）呈现可感知的差异化布局，摆脱当前"一律 PageHeader + DetailGrid + 两列卡片"的雷同节奏。每页独立交付、独立合并；顺带一次性清除 M1 已知 cosmetic 退化（`.interactive-card` / `.reveal-list` / `radar-draw` / 旧 token 类名 / `PageHeader.eyebrow` / `SurfaceCard.interactive` 废 props）。

## Architecture

- **7 个 feature 页面**（P1→P7 优先级逐页重构）：
  - P1 `/practice`（`src/features/practice/*`）：顶部总览主卡 + 主舞台 + 右侧最近考试三段布局；处理雷达图（保留静态 vs 换能力画像二选一）
  - P2 `/qa`（`src/features/qa/*`）：聊天气泡 + 左侧会话抽屉；闭环气泡形态单列 vs 左右
  - P3 `/questions`（`src/features/questions/*`）：保留 Header + filter + list 骨架，按新密度 / 组件重绘
  - P4 `/review`（`src/features/review/*`）：同 P3 模式
  - P5 `/interviews`（`src/features/interviews/*`）：左侧来源列表 + 右侧上下文
  - P6 `/import`（`src/features/import/*`）：表单主导 + step 2 分步感 + 多 action panel 收敛
  - P7 `/resume`（`src/features/resume/*`）：启动前独立判定是否升级为小 design doc
- **消费 M1 产物**（只读，不修改）：
  - Tokens（`src/app/globals.css`）
  - 原子 UI（`src/components/ui/*`）
  - 工作台原子组件（`src/components/workbench/*`）
  - Shell 层（`src/features/workbench/*`）
- **每页只动自己目录**：`src/features/<page>/*`；碰到 Shell / 原子组件 / tokens 改动必须先开 m1-infra 补丁 PR（走 T2.10 buffer），不扩大 M2 范围

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5.9
- Tailwind CSS v4.2（M1 `@theme inline` tokens）
- shadcn/ui new-york 风格（已在 M1 接入）
- lucide-react 图标
- Vitest（视觉层面"废弃类名 grep-absent"冒烟测试，取代单元测试）

## 关联设计文档

- [`docs/001-webui-refactor/roadmap.md`](../roadmap.md) §5 M2 · m2-feature-pages 定义（范围 / 里程碑 / 验收 / Risks / task-type 豁免）
- [`docs/001-webui-refactor/design.md`](../design.md) §9 Feature 页面重构优先级和方向 · §11.2 Phase 2 验收 · §12 未决事项（每页 design note 闭环）
- [`docs/001-webui-refactor/m1-infra/changelog.md`](../m1-infra/changelog.md) M1 交付清单 + 偏差 / 已知取舍 / M2 清理项
- [`docs/001-webui-refactor/m1-infra/report.md`](../m1-infra/report.md) M1 完成报告（§4 已知 cosmetic 退化 + §6 M2 前置建议）
- [`docs/reference/design-system.md`](../../reference/design-system.md) canonical UI 规范（M2 所有 PR 的唯一权威来源）

## 前置条件

- M1 `m1-infra` 已关闭（`m1-infra/changelog.md` `closure: m1-infra · status: complete`）
- `feature/001-webui-refactor` 分支包含 M1 全部 commits（`9c2f177 … 3b05630` + T1.11 + closing）
- `docs/reference/design-system.md` 已发布并被 `AGENTS.md` 索引
- 无前置 Spike（M2 scope 完全由 `roadmap.md §5` 决定，无新技术探索）

## Phase 闭环四类 task 覆盖

| 类别 | task IDs |
|---|---|
| 开发类 | T2.1 – T2.7（7 个 feature 页面重构） |
| 测试验收类 | T2.8（整体回归验证 + 7 页自测清单汇总） |
| 问题修复类 | T2.10（buffer：执行时 bug 修复 + M1 组件缺口补丁场景） |
| 结果交付类 | T2.9（整体收口：AGENTS.md / ui-flows / design-system 索引同步 + M2 完成报告） |

> ⚠ 豁免：本 phase 为**纯前端视觉/布局重构**，无新业务逻辑路径。测试类 task（T2.8）按 `roadmap.md §5.6` 规定**以"视觉 diff 自查 + 动作/路由对等自测清单"替代单元测试**；每个 development task 内含"废弃类名 grep-absent"冒烟测试作为 TDD Step 1-4 最小载体，但不生造业务单测。理由：`design.md §4.2` 明确 "不纳入业务逻辑 / API 契约 / 数据模型 / 服务层变更"，无新逻辑路径需要单测；若重构中顺带发现业务 bug，走独立 bugfix 工作流，不混入本 phase。

## 任务清单

- [ ] **T2.1** · `/practice` 页面重构（三段布局 + 雷达图决策 + 清理 1 处 radar-draw + 1 处 reveal-list + 63 处旧 token 类名） → [tasks/T2.1-practice-page.md](tasks/T2.1-practice-page.md)
- [ ] **T2.2** · `/qa` 页面重构（聊天气泡 + 左侧会话抽屉 + 清理 5 处 interactive-card + 3 处 reveal-list + 1 处 inline radial-gradient + 1 处 eyebrow= + 92 处旧 token 类名） → [tasks/T2.2-qa-page.md](tasks/T2.2-qa-page.md)
- [ ] **T2.3** · `/questions` 页面重构（保留骨架 + 按新密度重绘 + 清理 42 处旧 token 类名） → [tasks/T2.3-questions-page.md](tasks/T2.3-questions-page.md)
- [ ] **T2.4** · `/review` 页面重构（保留骨架 + 按新密度重绘 + 清理 72 处旧 token 类名） → [tasks/T2.4-review-page.md](tasks/T2.4-review-page.md)
- [ ] **T2.5** · `/interviews` 页面重构（左右分栏来源列表 + 上下文 + 清理 48 处旧 token 类名） → [tasks/T2.5-interviews-page.md](tasks/T2.5-interviews-page.md)
- [ ] **T2.6** · `/import` 页面重构（表单主导 + step 2 分步感 + 清理 1 处 reveal-list + 32 处旧 token 类名） → [tasks/T2.6-import-page.md](tasks/T2.6-import-page.md)
- [ ] **T2.7** · `/resume` 页面重构（启动前独立判定是否升级 design doc + 清理 5 处 interactive-card + 81 处旧 token 类名） → [tasks/T2.7-resume-page.md](tasks/T2.7-resume-page.md)
- [ ] **T2.8** · 整体回归验证（typecheck + lint + build + 7 页视觉 diff 汇总 + 动作/路由对等自测清单） → [tasks/T2.8-regression-verification.md](tasks/T2.8-regression-verification.md)
- [ ] **T2.9** · 整体收口交付（AGENTS.md 同步 + docs/reference/ui-flows.md 同步 + design-system 索引补齐 + M2 完成报告 + `design.md §12` 未决闭环汇总） → [tasks/T2.9-delivery-closing.md](tasks/T2.9-delivery-closing.md)
- [ ] **T2.10** · Buffer（执行时 bug 修复 + M1 组件缺口补丁 PR 场景记录） → [tasks/T2.10-buffer.md](tasks/T2.10-buffer.md)

## 依赖图

```
T2.1 (practice, 灯塔页)
  │
  ▼ (可能触发 T2.10 M1 补丁)
T2.2 (qa)
  │
  ▼
T2.3 (questions)
  │
  ▼
T2.4 (review)
  │
  ▼
T2.5 (interviews)
  │
  ▼
T2.6 (import)
  │
  ▼ (P7 启动前独立判定)
T2.7 (resume)
  │
  ▼
T2.8 (regression) ─▶ T2.10 (buffer 收敛) ─▶ T2.9 (delivery closing)
```

**关键依赖**：

- **强依赖**（顺序执行，来自 `handoff H1` + `roadmap.md §5.2`）：T2.1 → T2.2 → T2.3 → T2.4 → T2.5 → T2.6 → T2.7，逐页独立 PR，按 P1→P7 优先级推进
- **文件隔离**：T2.1–T2.7 各自独占 `src/features/<page>/*`，**文件级**无交集（无并行写冲突）；顺序约束来自"灯塔页先暴露 M1 组件缺口 + 降低 Shell 层 merge conflict 风险 + 单页回滚粒度"的工程决策，非技术强依赖
- **buffer 机制**：T2.10 在 T2.1 作为"灯塔页"暴露 M1 组件缺口时触发 M1 补丁 PR（不扩大 M2 范围，独立走 m1-infra patch）；执行期无问题则保留 "BUFFER: no issues encountered" 占位关闭
- **收口前置**：T2.8 依赖 T2.1–T2.7 全部合入；T2.9 依赖 T2.8 + T2.10（buffer 关闭）
- **P7 `/resume` 特殊节点**：T2.7 启动前需独立判定是否升级为小 design doc（对应 `roadmap.md §5.5` R4 风险）；若需升级，T2.7 拆为 T2.7a (design note 升级) + T2.7b (实现)，不影响 T2.1–T2.6 合入

## 执行批次

- **Batch 1（串行）**：T2.1
  - `/practice` 独占 `src/features/practice/*`；作为"灯塔页"先行，暴露 M1 组件缺口（若有）。
- **Batch 2（串行，依赖 T2.1 合入）**：T2.2
  - `/qa` 独占 `src/features/qa/*`；对齐 M1 已识别的 5 处 `interactive-card` + 3 处 `reveal-list` + 1 处 `eyebrow=` + 1 处 inline radial-gradient。
- **Batch 3（串行，依赖 T2.2 合入）**：T2.3
  - `/questions` 独占 `src/features/questions/*`；结构最轻（2 个 workbench 文件）。
- **Batch 4（串行，依赖 T2.3 合入）**：T2.4
  - `/review` 独占 `src/features/review/*`；模式同 T2.3 但 workbench 文件更多。
- **Batch 5（串行，依赖 T2.4 合入）**：T2.5
  - `/interviews` 独占 `src/features/interviews/*`；左右分栏布局。
- **Batch 6（串行，依赖 T2.5 合入）**：T2.6
  - `/import` 独占 `src/features/import/*`；表单主导 + step 2 分步。
- **Batch 7（串行，依赖 T2.6 合入 + P7 启动前决策）**：T2.7
  - `/resume` 独占 `src/features/resume/*`；最复杂，启动前决定是否升级 design doc。
- **Batch 8（串行，依赖 T2.1–T2.7 全部合入）**：T2.8
  - 整体回归验证，不改源代码（仅 `corepack pnpm typecheck + lint + build + db:init` + 7 页自测清单汇总）。
- **Batch 9（串行，依赖 T2.8）**：T2.10
  - Buffer：收敛执行期遇到的 bug / M1 补丁 PR 场景；无问题则保留 BUFFER 占位关闭。
- **Batch 10（串行，依赖 T2.8 + T2.10）**：T2.9
  - 结果交付：AGENTS.md 同步 + docs/reference/ui-flows.md 同步 + design-system 索引补齐 + M2 完成报告 + `design.md §12` 未决闭环汇总。

**并行机会说明**：T2.1–T2.7 的 `files_owned` 在 `src/features/<page>/*` 层面完全 disjoint，**理论上**可并行；但 `handoff H1 + roadmap.md §5.2` 明确要求 P1→P7 顺序，目的是：(a) 灯塔页先暴露 M1 缺口；(b) 降低 Shell 层 merge conflict 风险；(c) 单页 PR 回滚粒度清晰。因此**执行批次按顺序串行**，依赖图中的强依赖按此顺序表示。

## 全局风险

| ID | 风险 | 影响 | 缓解 |
|---|---|---|---|
| R-M2-01 | 7 页逐页推进中 M1 的原子组件 / tokens 发现缺口需回改 | 打断 M2 节奏，需开 m1-infra 补丁 PR | T2.1 `/practice` 作为"灯塔页"优先暴露缺口；补丁走 T2.10 buffer 记录 + 独立 m1-infra patch PR，不扩大 M2 范围 |
| R-M2-02 | 每页轻量 design note 过于简陋导致布局返工 | 单页多轮返工拖慢整体 | note 最小覆盖 5 项（目标 / 布局骨架 / 按钮摆放 / 空态 / 明确不做项），不强制走完整 design flow；每个 task 文件内嵌 design note 段 |
| R-M2-03 | 页面差异化节奏与"统一感"冲突 | 给用户"东一块西一块"的观感 | 差异仅限**布局骨架**；tokens / 按钮 / 卡片 / 字号 / 间距全部沿用 M1 统一规范，靠节奏差异而非元素差异制造区分 |
| R-M2-04 | `/resume` 结构动得最大可能超出"重构"范畴 | P7 单页失控 | T2.7 启动前独立判定是否升级为独立小 design doc；若是则不阻塞 T2.1–T2.6 合并 |
| R-M2-05 | 各页 PR 并行可能出现 merge conflict（共享 Shell / layout 文件） | 合并顺序依赖出现 | 每页 PR 只动自己 `src/features/<page>/*`；碰到 Shell 改动必须先合入 M1 补丁（T2.10 承接） |
| R-M2-06 | M1 已知 cosmetic 退化（`.interactive-card` / `.reveal-list` / `radar-draw` / 旧 token 类名 430 处）若遗漏清理，将在 M2 结束后仍残留 | 全局 grep 不 CLEAN，设计系统一致性退化 | 每页 task 验收条件硬要求该页对应清理项 grep 0；T2.8 回归验证在 `src/features/**` 全局 grep 确认 0 hits |
| R-M2-07 | `design.md §12` 未决事项（雷达图 / 气泡形态 / 空态插图 / 主题切换器 label）可能产生 scope creep | 每页决策反复 | 每个未决仅在对应页面启动时在该页 design note 内闭环，不反向影响 M1；T2.9 收口汇总所有决策落点 |
| R-M2-08 | 测试豁免被误读为"不做任何测试" | 质量风险、回归盲区 | 每个 development task 保留 TDD Step 1-4 载体（视觉层"废弃类名 grep-absent"冒烟测试），确保 Vitest 仍可 run；T2.8 回归验证强制跑全量 Vitest + typecheck + lint + build + db:init |

## 验收标准（Phase 级）

对应 `design.md §11.2` 和 `roadmap.md §5.4` 中 **Phase 2 完成判定** 的 4 条 checkbox + 整体收口：

- [ ] 7 个 feature 页面（practice / qa / questions / review / interviews / import / resume）所有动作、数据展示、路由跳转与重构前对等（每页 PR 附动作/路由对等自测清单）
- [ ] 页面间节奏可感知不同（至少 practice / qa / questions 三类有差异化布局）
- [ ] 统一遵循"一个语境一个 Primary"与"Header 紧凑 Body 平衡"（`docs/reference/design-system.md §2/§4`）
- [ ] 所有按钮 / input / badge 使用 M1 新组件，无 inline 样式 hack
- [ ] `src/features/**` 全局 grep CLEAN：`interactive-card` / `reveal-list` / `radar-draw` / `border-border-strong` / `text-text-muted` / `text-text-strong` / `border-border-muted` / `bg-accent` / `text-accent` / `eyebrow=` 均 0 hits
- [ ] `design.md §12` 未决事项（雷达图去留 / qa 气泡形态 / 空态插图 / 主题切换器 label）全部闭环（T2.9 汇总）
- [ ] `AGENTS.md` 中 UI 相关描述保持一致或被 PR 同步更新（T2.9）
- [ ] `docs/reference/ui-flows.md` 若含 UI 描述同步更新（T2.9）
- [ ] 新 tokens / 组件规范在 `AGENTS.md` 或 `docs/reference/design-system.md` 有入口索引（T2.9 验证 M1 交付持续有效）
- [ ] `corepack pnpm db:init + typecheck + lint + build` 全部通过（T2.8）
- [ ] 每页 PR 合并前独立运行 `db:init + typecheck + lint + build` 均 PASS（每页 task 验收条件）

补充：

- [ ] 每个 task 文件末尾有 completion marker
- [ ] 本 plan.md 末尾有 completion marker
- [ ] 不提交（commit 由主 Agent 在 review 后统一做）

<!-- handoff: H1 · status: complete · timestamp: 2026-04-15 22:40 -->
