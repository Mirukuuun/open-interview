# M1 · m1-infra · 主 Plan

- doc_type: phase_plan
- status: proposed
- workstream: `001-webui-refactor`
- phase: `m1-infra`
- complexity: L2
- updated_at: 2026-04-15
- git_branch: `feature/001-webui-refactor`
- work_dir: `docs/001-webui-refactor/m1-infra/`

## Goal

建立全站统一的 design tokens 体系，重写所有原子 UI / workbench 组件，重构 Shell 层（sidebar / topbar / shell / root layout），并完整支持浅色 + 深色双态。产出一个**独立可上线**的视觉基础设施层：现有 7 个 feature 页面不改布局，仅通过共享 tokens 和重写组件自动"换皮"。

## Architecture

- **Tokens 层**（`src/app/globals.css`）：CSS 变量（浅色 + `.dark` 深色双态）+ Tailwind `@theme inline` 映射；砍 `body` radial gradient / `--surface-nav` / `.interactive-card` / `.reveal-list` / `@keyframes fade-in-up` / `@keyframes radar-draw` / `.sidebar-tooltip`。
- **字体层**（`package.json` + `src/app/layout.tsx`）：移除 `@fontsource/ibm-plex-sans` 和 `@fontsource/ibm-plex-mono`，新增 `@fontsource/inter` variable；保留 `@fontsource/jetbrains-mono`。
- **深色模式基础设施**（`src/components/ui/theme-toggle.tsx` 新增 + `src/app/layout.tsx`）：`.dark` 根类切换 + `localStorage.openInterviewTheme` 记忆 + system/light/dark 三态。
- **原子 UI 组件**（`src/components/ui/*.tsx`）：重写 7 个 + 新增 4 个（tooltip / dialog / separator / theme-toggle）。
- **工作台原子组件**（`src/components/workbench/*.tsx`）：重写 6 个。
- **Shell 层**（`src/features/workbench/{app-sidebar,top-bar,shell}.tsx` + `src/app/(workbench)/layout.tsx` + `src/app/layout.tsx`）：浅色底 sidebar + 瘦身 topbar + 去魔术数字 shell + root layout 承载字体和主题类。

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5.9
- Tailwind CSS v4.2（`@theme inline` 模式，配置驻留在 `globals.css`）
- shadcn/ui new-york 风格（baseColor zinc，已配置在 `components.json`）
- lucide-react 图标
- `@fontsource/inter` + `@fontsource/jetbrains-mono`
- Vitest（原子组件 render 冒烟测试）

## 关联设计文档

- [`docs/001-webui-refactor/design.md`](../design.md) §5 全局规范 · §6 按钮 · §7 原子组件 · §8 Shell · §10 迁移策略 · §11.1 Phase 1 验收
- [`docs/001-webui-refactor/roadmap.md`](../roadmap.md) §4 M1 定义 · §6 风险登记

## 前置条件

- `design.md` 已 ready（status proposed，已敲定）
- `roadmap.md` §4 已 ready（H1-planning-roadmap 已 complete）
- git 分支 `feature/001-webui-refactor` 已创建
- 无前置 Spike（`design.md` 已覆盖所有关键决策）

## Phase 闭环四类 task 覆盖

| 类别 | task IDs |
|---|---|
| 开发类 | T1.1 – T1.8 |
| 测试验收类 | T1.9 |
| 问题修复类 | T1.10（buffer） |
| 结果交付类 | T1.11 |

无豁免。本 phase 为重构 + 新增混合，4 类覆盖齐全。

## 任务清单

- [x] **T1.1** · Tokens 层完全重写 + 废弃 CSS 清理 → [tasks/T1.1-tokens-globalcss-rewrite.md](tasks/T1.1-tokens-globalcss-rewrite.md)
- [ ] **T1.2** · 字体依赖切换（移除 IBM Plex / 新增 Inter） → [tasks/T1.2-fonts-swap.md](tasks/T1.2-fonts-swap.md)
- [ ] **T1.3** · 深色模式基础设施（theme-toggle 组件 + 三态切换 + localStorage 记忆） → [tasks/T1.3-dark-mode-infra.md](tasks/T1.3-dark-mode-infra.md)
- [ ] **T1.4** · Button 组件重写（5 variant × 4 size，全部 1px border 几何对齐） → [tasks/T1.4-button-rewrite.md](tasks/T1.4-button-rewrite.md)
- [x] **T1.5** · 其他原子 UI 重写（badge / input / select / textarea / skeleton） → [tasks/T1.5-atomic-ui-rewrite.md](tasks/T1.5-atomic-ui-rewrite.md)
- [x] **T1.6** · Card 拆分 + 新增组件（tooltip / dialog / separator） → [tasks/T1.6-card-and-new-ui.md](tasks/T1.6-card-and-new-ui.md)
- [ ] **T1.7** · 工作台原子组件重写（page-header / section-heading / empty-list / detail-grid / form-field / placeholder-table） → [tasks/T1.7-workbench-atoms-rewrite.md](tasks/T1.7-workbench-atoms-rewrite.md)
- [ ] **T1.8** · Shell 层重构（app-sidebar / top-bar / shell / workbench layout / root layout 主题类） → [tasks/T1.8-shell-refactor.md](tasks/T1.8-shell-refactor.md)
- [ ] **T1.9** · 跨组件回归验证（typecheck + lint + build + 视觉 diff 自查 + 375px 自查 + 深色模式自查） → [tasks/T1.9-regression-verification.md](tasks/T1.9-regression-verification.md)
- [ ] **T1.10** · Buffer（执行时 bug 修复记录 + 回归测试） → [tasks/T1.10-buffer.md](tasks/T1.10-buffer.md)
- [ ] **T1.11** · 文档交付（M1 完成报告 + 组件 API 变更清单 + design-system 入口索引） → [tasks/T1.11-delivery-docs.md](tasks/T1.11-delivery-docs.md)

## 依赖图

```
T1.1 (tokens/globals.css)
  │
  ├─▶ T1.4 (Button)        ──┐
  ├─▶ T1.5 (atomic UI)     ──┼─▶ T1.7 (workbench atoms) ──┐
  ├─▶ T1.6 (Card + new UI) ──┘                             │
  │                                                         │
T1.2 (fonts + layout.tsx font) ──▶ T1.3 (dark mode + layout.tsx theme) ──▶ T1.8 (shell + layout.tsx theme class) ──┐
                                                                                                                    │
                                                                                                          T1.9 (regression) ─▶ T1.10 (buffer) ─▶ T1.11 (delivery)
```

**关键依赖**：
- T1.1 是所有后续 task 的前置（tokens 是全局规范源）
- `src/app/layout.tsx` 被 T1.2 / T1.3 / T1.8 共享，必须**串行**（T1.2 → T1.3 → T1.8），不允许并行
- T1.7 依赖 T1.4 / T1.5 / T1.6（工作台组件消费原子 UI）
- T1.8 依赖 T1.3（shell 需要深色模式 class 和 theme-toggle 组件）和 T1.7（shell 消费 workbench 原子组件）
- T1.9 依赖所有开发类 task 完成
- T1.10 在 T1.9 发现问题时填充；无问题则保留 "BUFFER: no issues encountered" 占位后关闭
- T1.11 在 T1.9 + T1.10 完成后启动

## 执行批次

- **Batch 1（串行，只含 T1.1）**：T1.1
  - T1.1 独占 `src/app/globals.css`；所有 tokens 定义的源点，必须先完成。
- **Batch 2（并行）**：T1.2, T1.4, T1.5, T1.6
  - T1.2 独占 `package.json`，共享 `src/app/layout.tsx`（只动 font import 部分）。
  - T1.4 独占 `src/components/ui/button.tsx`。
  - T1.5 独占 `src/components/ui/{badge,input,select,textarea,skeleton}.tsx`。
  - T1.6 独占 `src/components/ui/{surface-card.tsx→card.tsx,tooltip.tsx,dialog.tsx,separator.tsx}`。
  - 四者之间无文件冲突，可并行。
- **Batch 3（串行，依赖 T1.2）**：T1.3
  - T1.3 共享 `src/app/layout.tsx`（加 theme class + ThemeProvider），必须在 T1.2 字体 import 合入后再开始；独占 `src/components/ui/theme-toggle.tsx`。
- **Batch 4（串行，依赖 Batch 2 全部完成）**：T1.7
  - T1.7 独占 `src/components/workbench/*.tsx`，但消费 T1.4/T1.5/T1.6 的原子组件，必须等它们完成。
- **Batch 5（串行，依赖 T1.3 + T1.7）**：T1.8
  - T1.8 独占 `src/features/workbench/{app-sidebar,top-bar,shell}.tsx` 和 `src/app/(workbench)/layout.tsx`，共享 `src/app/layout.tsx`（加根级 theme class）；消费深色模式 infra 和 workbench 原子组件。
- **Batch 6（串行，依赖 Batch 5）**：T1.9
  - 回归验证，不改源代码。
- **Batch 7（串行，依赖 T1.9）**：T1.10
  - 若 T1.9 无问题，保留 BUFFER 占位并关闭；否则填入修复记录。
- **Batch 8（串行，依赖 T1.10）**：T1.11
  - 文档交付。

## 全局风险

| ID | 风险 | 影响 | 缓解 |
|---|---|---|---|
| R-M1-01 | Button props 签名变更打断下游调用（grep 命中 593 处原子组件用点） | typecheck 大面积红 | T1.4 保持 `variant / href / children` 签名，新增 `size` 默认 `md` 等价现有 `h-11`；T1.9 全仓 grep 调用点验证 |
| R-M1-02 | 深色模式 tokens 在图表 / skeleton / 透明叠加色上有盲区 | 深色下视觉崩坏 | T1.1 所有 tokens 双态定义齐全；T1.9 逐组件双态自查，skeleton 用 `surface-subtle` 色 token |
| R-M1-03 | Shell `min-h-[calc(100vh-77px)]` 去掉后 flex 撑满在移动端短屏幕出错位 | 移动端滚动容器错位 | T1.8 用浏览器 devtools 在 375 / 1280 / 1920 三档 viewport 自查；T1.9 验收清单强制 375px 自查 |
| R-M1-04 | IBM Plex 移除 + Inter 引入导致首屏 FOUT/FOIT | 首屏闪烁或字体错位 | T1.2 用 `@fontsource/inter` variable 版本 + `font-display: swap`（默认）；layout.tsx font stack fallback 到 PingFang SC / Microsoft YaHei |
| R-M1-05 | 组件重写引入 a11y 回归（aria-label / focus ring 丢失） | 键盘导航 / 屏幕阅读器退化 | T1.4 所有 icon-only button 强制 `aria-label`；T1.6 Tooltip 组件承载 aria 语义；T1.9 a11y 基本清单自查 |
| R-M1-06 | 砍掉 `.interactive-card` / `.reveal-list` / `@keyframes radar-draw` 全局类后，feature 页面（resume/qa/practice/import）直接引用这些 class 的地方会失去 cosmetic 效果 | feature 页视觉退化（非功能崩坏） | **已知取舍**：roadmap §4.4 明确要求"真的删除"；这些页面属于 M2 领地，M1 不补救；M2 逐页重构时会彻底去掉这些引用；在 T1.11 delivery 文档中明确列出受影响的文件清单 |
| R-M1-07 | Tailwind v4 `@theme inline` 与 `.dark` 变体写法冲突 | 深色 token 不生效 | T1.1 严格按 Tailwind v4 规范（`@variant dark (.dark &)` 或 `:root.dark` 双重定义）实现；T1.9 构建日志检查 |

## 验收标准（Phase 级）

对应 `design.md` §11.1 和 `roadmap.md` §4.4 中 **Phase 1 完成判定** 的 7 条 checkbox：

- [ ] `corepack pnpm db:init + typecheck + lint + build` 全部通过
- [ ] 所有现有 7 个 feature 页面在新组件 / 新 tokens 下渲染无崩坏（视觉 diff 自查）
- [ ] 任一排按钮（PageHeader 右上角 / Dialog footer）跨 variant 实测高度差 ≤ 0
- [ ] 颜色 / 字体 / 圆角 / 阴影 / 表面层级 tokens 在浅色 + 深色两套完整可用
- [ ] 主题切换器三态（system / light / dark）切换正常，`localStorage.openInterviewTheme` 记忆正常
- [ ] 375px 宽度 viewport 下 sidebar 塌成顶部抽屉，主区域不溢出
- [ ] 代码里不再存在 `body` radial gradient / `.reveal-list` 动画 / `.interactive-card` 全局类 / `--surface-nav` 深色靛紫 / IBM Plex 字体引用（git diff 可见"删除"而非"覆盖"）

补充：

- [ ] 每个 task 文件末尾有 completion marker
- [ ] 本 plan.md 末尾有 completion marker
- [ ] 不提交（commit 由主 Agent 在 review 后统一做）

<!-- handoff: H1 · status: complete · timestamp: 2026-04-15 17:05 -->
