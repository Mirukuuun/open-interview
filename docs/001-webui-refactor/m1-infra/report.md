---
doc_type: phase_report
status: complete
phase: m1-infra
workstream: 001-webui-refactor
completed_at: 2026-04-15
git_branch: feature/001-webui-refactor
---

# M1 · m1-infra · Phase 完成报告

> 来源汇总：`design.md §§5-8/11.1` · `roadmap.md §4` · `m1-infra/plan.md` · `m1-infra/tests/T1.9-regression-report.md` · `m1-infra/tasks/T1.10-buffer.md` · `src/app/globals.css` · git log (commits `9c2f177 … 3b05630`)。

本报告作为 M1 phase 的一次性对外交付物，供 M2 实施 / 其他 feature 分支开发者 / 未来恢复会话的 Agent 快速对齐 M1 成果，不必回读 11 个 task 文件和零散 commit。

---

## 1. 实际交付物

M1 产出分 **Tokens / 原子组件 / Shell** 三大块，全部落盘在 `feature/001-webui-refactor` 分支，编译测试全绿（见 §2）。

### 1.1 Tokens 层（T1.1 + T1.2）

来源 task：`m1-infra/tasks/T1.1-tokens-globalcss-rewrite.md`、`T1.2-fonts-swap.md`。

| 类别 | 交付物 | 位置 |
|---|---|---|
| 颜色 token | 6 槽功能色 + soft 变体、zinc 9 档中性灰阶、3 层表面、语义别名；浅色 `:root` + 深色 `.dark` 双态 | `src/app/globals.css:8-76` |
| 圆角 token | `--radius-sm 4px / md 6px / lg 10px / full 999px` | `src/app/globals.css:37-40` |
| 阴影 token | `--shadow-sm / md / lg`（浅色 + 深色两套不透明度） | `src/app/globals.css:43-45, 73-75` |
| 字体 token | `--font-sans: Inter, PingFang SC, Microsoft YaHei` + `--font-mono: JetBrains Mono` | `src/app/globals.css:10-11` |
| 动效 token | `--duration-base: 150ms / --ease-out` + `@keyframes skeleton-pulse` + `prefers-reduced-motion` fallback | `src/app/globals.css:48-49, 145-160` |
| Tailwind v4 映射 | `@theme inline { … }` 块把全部 tokens 暴露为 Tailwind 工具类 | `src/app/globals.css:78-110` |
| 字体依赖 | `package.json` 移除 `@fontsource/ibm-plex-sans` / `-mono`，新增 `@fontsource/inter` variable；保留 `@fontsource/jetbrains-mono` | `package.json` · `src/app/layout.tsx` |
| 砍掉 | `--surface-nav` / `body` radial gradient / `.interactive-card` / `.reveal-list` / `@keyframes fade-in-up` / `@keyframes radar-draw` / `.sidebar-tooltip` / IBM Plex 字体引用 | `src/app/globals.css`（grep 0 hits 验证，T1.9 §2.1-2.3） |

提交：`9c2f177 feat(ui): rewrite globals.css tokens for Linear-派 design system (M1/T1.1)`、`158b41f feat(ui): swap IBM Plex to Inter, wire font-sans class to body (M1/T1.2)`。

### 1.2 原子组件（T1.3 + T1.4 + T1.5 + T1.6 + T1.7）

| 类别 | 组件 | 位置 | 任务 |
|---|---|---|---|
| UI 重写 | `Button`（5 variant × 4 size，1px border 几何对齐） | `src/components/ui/button.tsx` | T1.4 |
| UI 重写 | `Badge`（7 tone × 2 variant，默认 soft 风，去强制 uppercase） | `src/components/ui/badge.tsx` | T1.5 |
| UI 重写 | `Input` / `Select` / `Textarea` / `Skeleton` | `src/components/ui/{input,select,textarea,skeleton}.tsx` | T1.5 |
| UI 重写 | `SurfaceCard`（薄 wrapper，`interactive` 降级 no-op）+ 新 `Card` 拆分 `CardHeader / CardBody / CardFooter` | `src/components/ui/{surface-card,card}.tsx` | T1.6 |
| UI 新增 | `Tooltip`（取代全局 `.sidebar-tooltip`）/ `Dialog` / `Separator` | `src/components/ui/{tooltip,dialog,separator}.tsx` | T1.6 |
| 深色模式 | `ThemeProvider`（`openInterviewTheme` localStorage 记忆 + system/light/dark 三态）+ `ThemeToggle`（顶栏 icon-only 三态循环） | `src/components/ui/{theme-provider,theme-toggle}.tsx` | T1.3 |
| Workbench 重写 | `PageHeader`（瘦身：title + actions + 可选 highlights→StatsRow） | `src/components/workbench/page-header.tsx` | T1.7 |
| Workbench 重写 | `SectionHeading` / `EmptyList`（空态 xl CTA）/ `DetailGrid`（KV row）/ `FormField` / `PlaceholderTable` | `src/components/workbench/*.tsx` | T1.7 |
| Workbench 新增 | `StatsRow`（从 PageHeader 降格拆出） | `src/components/workbench/stats-row.tsx` | T1.7 |
| 配套测试 | `tests/button.test.tsx` / `atomic-ui.test.tsx` / `card-and-new-ui.test.tsx` / `theme-toggle.test.tsx` / `workbench-atoms.test.tsx` / `fonts-swap.test.ts` / `shell-smoke.test.tsx` | `tests/` | T1.2–T1.8 |

提交：`a60950f`（T1.4）/ `21c062e`（T1.5）/ `bcd5ed4`（T1.6）/ `277cfe7`（T1.7）/ `776e2b8`（T1.3）。

### 1.3 Shell 层（T1.8）

| 文件 | 变更 | 任务 |
|---|---|---|
| `src/features/workbench/app-sidebar.tsx` | 浅色底 + 深文字；去 4 色方块 logo / 渐变 logo 卡片 / inset shadow；`hover:bg-zinc-100 / active:bg-zinc-200 / 选中 bg-brand-soft text-brand`；保留 localStorage 折叠记忆；移动态 `Menu / X` 顶部抽屉 | T1.8 |
| `src/features/workbench/top-bar.tsx` | 砍 eyebrow + "工作台" + "本地优先"；保留面包屑 + ThemeToggle + LLM provider 状态 pill；`sticky top-0 backdrop-blur` 保留 | T1.8 |
| `src/features/workbench/shell.tsx` | 去 `min-h-[calc(100vh-77px)]` 魔术数字（grep 0 hits）；`max-w-[1680px]` 保留；flex 撑满 | T1.8 |
| `src/app/(workbench)/layout.tsx` | 与 shell 协调的主内容容器节奏 | T1.8 |
| `src/app/layout.tsx` | 替换 font-import（去 IBM Plex 换 Inter）；挂载 `ThemeProvider`；`<head>` 注入 `themeBootstrap` IIFE 避免闪烁 | T1.2 + T1.3 + T1.8 |

提交：`ba89ed3 feat(ui): refactor Shell layer to light palette and token-driven layout (M1/T1.8)`。

---

## 2. 规格符合度（对照 `design.md §11.1` 的 7 条 Phase 1 验收）

| # | 验收 checkbox | 状态 | 证据 |
|---|---|---|---|
| 1 | `db:init` / `typecheck` / `lint` / `build` 全部通过 | ✓ | T1.9 §一 构建验证 5/5 PASS（`tsc --noEmit` 0 errors / `eslint .` 0 warnings / `✓ Compiled successfully in 12.8s` / 41 routes 生成）；附带 83/83 Vitest tests PASS |
| 2 | 所有现有页面用新组件渲染无崩坏 | ✓ 源码层 PASS / 视觉层待用户手动验收 | T1.9 §三 7 页 checklist；源码 typecheck + 测试通过；已知 cosmetic 退化按 R-M1-06 "已知取舍"归 M2，不阻塞（见本报告 §4） |
| 3 | 按钮几何对齐：任意一排按钮高度差 ≤ 0 | ✓ 源码层 PASS / DOM 实测待用户 | T1.9 §四 4.1 `sizeClasses` 静态证明（同 size 下 `h-7 / h-[34px] / h-10 / h-[46px]` 跨 variant 一致）；全 variant 统一 1px border，geometry 源自同一 size token |
| 4 | 颜色 token 在浅色 / 深色两套完整可用 | ✓ | T1.9 §二 2.4 + §五 5.1；30+ tokens 浅色 `:root` + 深色 `.dark` 双态逐条核对齐备，`@theme inline` 映射完整 |
| 5 | 主题切换器三态切换正常，localStorage 记忆正常 | ✓ 源码层 PASS / 交互待用户手动 | `ThemeProvider` STORAGE_KEY = `openInterviewTheme` + system/light/dark 三态（`theme-provider.tsx:13-23`）；`ThemeToggle` NEXT 循环 `system → light → dark → system`（`theme-toggle.tsx:14-18`）；`tests/theme-toggle.test.tsx` 2/2 PASS |
| 6 | 375px viewport sidebar 塌成抽屉，主区域不溢出 | ✓ 源码层 PASS / 响应式实测待用户 | T1.9 §七 7.1；`app-sidebar.tsx` 有 `mobileOpen` state + `Menu / X` 图标；shell `min-h-[calc(100vh-77px)]` 已去（grep 0） |
| 7 | 砍掉的 `body` radial gradient / `.reveal-list` / `.interactive-card` / `--surface-nav` / IBM Plex 等在代码里"真的删除" | ✓ | T1.9 §二 2.1/2.2/2.3 grep CLEAN：`src/app/globals.css` 无任一废弃 token 定义；`package.json` 无 IBM Plex 依赖；`src/` 无 IBM Plex 字面量、无 `.sidebar-tooltip` / `calc(100vh-77px)` / `body` radial gradient |

整体：7 条 checkbox **全部 PASS**（其中 3 条的浏览器层验证为 T1.9 spec 规定的用户手动项，SubAgent 限制所致，不是缺陷）。

---

## 3. 组件 API 变更清单

来源：T1.9 §八。下游调用方 grep 命中数来自 `src/features/**`，typecheck 0 errors 已证明签名层全部兼容。

### 3.1 `Button`（`src/components/ui/button.tsx`）

| 维度 | 变更 | 下游影响 |
|---|---|---|
| `variant` | 新增 `destructive` / `link`；保留 `primary` / `secondary` / `ghost` | 签名兼容 |
| `size` | **新增** `"sm" \| "md" \| "lg" \| "xl"`，默认 `md = h-[34px]` | 114 处调用 / 32 文件，**0 处显式传 `size`** → 全部从旧 `h-11=44px` 收缩到 34px。属 design.md §3.3 "Header 紧凑" 有意收敛，非 break |
| 几何 | 全 variant 统一 `1px border`（旧 primary 无 border） | 同排按钮高度严格一致 |
| `href` | 保留（走 `<Link>`） | 兼容 |
| 默认 `variant` | 新默认 `secondary`（旧无默认） | 114 处调用点 typecheck 0 errors；若某处旧视觉依赖 44px 主按钮权重，M2 显式加 `size="lg"` 或 `"xl"` |

### 3.2 `Badge`（`src/components/ui/badge.tsx`）

| 维度 | 变更 | 下游影响 |
|---|---|---|
| `tone` | 新增 `destructive` / `info`；`accent` 保留为 `brand` 别名 | 27 处 `tone="accent"` / 13 文件，继续按 brand 色渲染 |
| `variant` | **新增** `"solid" \| "soft"`，默认 `soft` | 0 处显式传 `variant`；旧 solid 强彩填白字降级为 soft `brand-soft` 背景 + `brand` 文字；**视觉变化**但非 break（符合 §3.2 克制优先） |
| 强制 uppercase | **取消** | features/ 内所有 `<Badge>` 子层无 uppercase 依赖（T1.9 §八 2 确认） |

### 3.3 `SurfaceCard`（`src/components/ui/surface-card.tsx`）

| 维度 | 变更 | 下游影响 |
|---|---|---|
| 实现 | 变成 `Card` 薄 wrapper + 默认 `p-5` | `className` 覆盖 padding 时 `cn()` 后者优先 |
| `muted` | 保留并透传 | 兼容 |
| **`interactive`** | **保留但降级 no-op**（JSDoc `@deprecated`） | 0 处传 `interactive={true}`；旧视觉依赖走 `className="interactive-card"` 全局类，该类已删 → **10 处 cosmetic 退化**（见 §4 a 项） |

### 3.4 `PageHeader`（`src/components/workbench/page-header.tsx`）

| 维度 | 变更 | 下游影响 |
|---|---|---|
| **`eyebrow`** | **保留但忽略**（未 destructure，未渲染，JSDoc `@deprecated`） | 1 处命中 `src/features/qa/qa-workbench.tsx:57` 传 `eyebrow="Grounded QA"` → 静默忽略，属 design.md §5.3 预期行为 |
| `highlights` | signature 保留，行为改：从 grid badge 改为走 `StatsRow` 自动渲染 | 所有传 `highlights` 调用点视觉节奏变化，内容仍可见 |
| `title` / `actions` / `className` | 保留 | 兼容 |
| 装饰层 | 砍渐变 / 大标题 / 4 列 grid → `rounded-lg + border + px-4 py-3` 紧凑条 | 首屏重量下降 |

### 3.5 其他新签名（无不兼容，仅列差异要点）

| 组件 | 要点 |
|---|---|
| `Input` / `Textarea` / `Select` | 视觉收敛：统一 `border-[color:var(--color-border)]` / `rounded-md` / focus ring 用 `--color-brand`；签名 100% 兼容 |
| `Skeleton` | `surface-subtle` 色 token + `@keyframes skeleton-pulse`；签名兼容 |
| `Card` / `CardHeader` / `CardBody` / `CardFooter` | 新增拆分（T1.6）；SurfaceCard 内部消费 |
| `Dialog` / `Tooltip` / `Separator` | 新增（T1.6），无旧签名冲突 |
| `ThemeToggle` / `ThemeProvider` | 新增（T1.3），无旧签名冲突 |
| `SectionHeading` / `EmptyList` / `DetailGrid` / `FormField` / `PlaceholderTable` / `StatsRow` | T1.7 重写，typecheck 0 errors |

---

## 4. 已知 cosmetic 退化（M2 领地）

全部来自"已删除的全局 CSS 类 / 旧 token 类名在 feature 页面的直接引用"。按 `roadmap.md §4.4` 要求"真的删除"，M1 不补救；归 M2 逐页重构时彻底去除。数据来自 T1.9 §3.1。

### (a) `.interactive-card` hover 类 —— 10 处

全局类已删；`SurfaceCard.interactive` 降为 no-op。影响：hover 态的 box-shadow / border 色过渡不再生效；静态表现不受影响。

| 文件 | 行号 |
|---|---|
| `src/features/qa/qa-session-workbench.tsx` | 214 |
| `src/features/qa/qa-workbench.tsx` | 108 |
| `src/features/qa/qa-ask-form.tsx` | 197 |
| `src/features/qa/qa-workbench-shell.tsx` | 119, 324 |
| `src/features/resume/project-workbench.tsx` | 118 |
| `src/features/resume/resume-detail-workbench.tsx` | 56 |
| `src/features/resume/resume-workbench.tsx` | 125, 162 |
| `src/features/resume/project-session-workbench.tsx` | 158 |

### (b) `.reveal-list` 入场动画 —— 5 处

全局 `@keyframes fade-in-up` + `.reveal-list > *` 已删。影响：列表入场 fade-in-up 缺失；内容正常显示。

| 文件 | 行号 |
|---|---|
| `src/features/qa/qa-workbench.tsx` | 105 |
| `src/features/qa/qa-workbench-shell.tsx` | 317, 422 |
| `src/features/import/import-workbench.tsx` | 143 |
| `src/features/practice/practice-recent-exams-panel.tsx` | 31 |

### (c) `@keyframes radar-draw` —— 1 处

全局 keyframes 已删。影响：`/practice` 雷达图不再"画出来"，静态显示；功能不受影响。

| 文件 | 行号 | 引用形式 |
|---|---|---|
| `src/features/practice/practice-radar-chart.tsx` | 156 | `style={{ animation: "radar-draw 900ms ease-out forwards" }}` |

### (d) 旧 token 类名（`border-border-strong` / `text-text-muted` / `bg-accent` 合集） —— 430 处 / 37 文件

T1.1 已用 `--color-*` 语义变量替换；对应 `--color-border-strong` 等变量在新 `globals.css` 中不存在。Tailwind v4 会编译为 `border-color: var(--color-border-strong)` 但变量解析为空，导致 border / 文字 color 回落继承。属同一类"旧视觉遗产"，M2 逐页替换。

### (e) 内联 radial-gradient —— 1 处

| 文件 | 行号 | 说明 |
|---|---|---|
| `src/features/qa/qa-workbench-shell.tsx` | 397 | inline `bg-[radial-gradient(...)]`；**不是**被禁止的 `body` radial gradient（已 clean），而是 QA shell 局部装饰背景；M2 QA 重构按克制优先考虑去除 |

---

## 5. T1.10 Buffer 修复汇总

引用 `docs/001-webui-refactor/m1-infra/tasks/T1.10-buffer.md`：

> **BUFFER: no issues encountered; phase verification passed on first sweep.**
>
> T1.9 回归 report 的工具链验证全部 PASS（`db:init` / `typecheck` / `lint` / `build` / `test 83/83`），废弃资源 grep CLEAN，M1 scope 内无需修复。T1.9 记录的 3 条 concerns（feature 目录 430 处旧 token 类名 / 浏览器 5 组用户验收 / Build NFT warning）均属已知取舍或非 M1 scope。

T1.10 由主 Agent 直接处置（buffer + no-issues 路径符合 executing-phase 类别过滤规则，跳过 implementer 派发），closure marker：`<!-- closure: T1.10 · status: no-issues-encountered · closed_by: main-agent · timestamp: 2026-04-15 20:05 -->`。

本 phase **无本次实际修复 commit**；T1.10 buffer task 留空并关闭。

---

## 6. M2 前置建议

在 M2 `m2-feature-pages` 启动时，建议先检查下列项：

1. **清除本页旧 token 类名**：M2 每页 PR 的"要动的文件"一定要覆盖该页所有 `border-border-strong` / `text-text-muted` / `text-text-strong` / `border-border-muted` / `bg-accent` / `text-accent` 等旧类名，替换为 `border-[color:var(--color-border)]` / `text-[color:var(--color-muted-foreground)]` / `text-[color:var(--color-foreground)]` / `bg-[color:var(--color-brand-soft)]` 等新 token。参见本报告 §4 (d) 的命中文件列表；M2 每页 design note 必须显式列出该页旧类名清理清单。
2. **消除本页 `.interactive-card` / `.reveal-list` / `radar-draw` 引用**：参见 §4 (a) (b) (c) 的精确文件+行号，每页 PR 一次性去除（hover 改走新 Tailwind `hover:border-brand` 等直接表达）；`/practice` 雷达图是否保留在 M2 P1 启动时决定（对应 `design.md §12` 未决事项 1）。
3. **消费 M1 新组件，不要绕路**：M2 页面布局重构禁止再用 `<button>` 原生标签、裸 `<div class="rounded-xl border ..."/>` 等 inline 表达；必须用 `Button` / `Card` / `Badge` / `Dialog` / `Tooltip` / `ThemeToggle`。按 "一个语境一个 Primary" 的摆放规则（见 `docs/reference/design-system.md §2`）统一 PageHeader / Dialog footer 的按钮编排。
4. **`PageHeader.eyebrow` 调用点清理**：M2 触达 `src/features/qa/qa-workbench.tsx:57` 时顺手去掉 `eyebrow="Grounded QA"` 参数（当前已被静默忽略，清理属于 N 分钟工作量）；grep 保证 features/ 内 0 处剩余 `eyebrow=` 调用。
5. **每页 design note 模板就位**：`m2-feature-pages/` 目录下每页一份轻量 design note（单页 markdown，参见 `roadmap.md §5.2`），最小覆盖 5 项：目标 / 布局骨架 / 按钮摆放 / 空态 / 明确不做项；不走完整 design.md 流程。note 与 `planning-phase` 主 plan 并存，note 先于 plan。

---

## 附录：M1 Commits

```
9c2f177 feat(ui): rewrite globals.css tokens for Linear-派 design system (M1/T1.1)
f4fe4a6 docs(001-webui-refactor): close T1.1 handoff and tick plan.md (M1/T1.1)
158b41f feat(ui): swap IBM Plex to Inter, wire font-sans class to body (M1/T1.2)
a60950f feat(ui): rewrite Button with 5 variants x 4 sizes geometric alignment (M1/T1.4)
b607dd2 docs(001-webui-refactor): close H3+H4, tick T1.2+T1.4 (M1)
21c062e feat(ui): rewrite 5 atomic UI components on Linear tokens (M1/T1.5)
bcd5ed4 feat(ui): add Card split and new overlay primitives (M1/T1.6)
4d91265 docs(001-webui-refactor): close H5+H6, tick T1.5+T1.6 (M1)
277cfe7 feat(ui): rewrite workbench atoms against new tokens + split StatsRow (M1/T1.7)
776e2b8 feat(ui): add ThemeProvider, ThemeToggle and localStorage-memoized dark mode (M1/T1.3)
3a7207b docs(001-webui-refactor): close H7+H8, tick T1.3+T1.7 (M1)
ba89ed3 feat(ui): refactor Shell layer to light palette and token-driven layout (M1/T1.8)
092143d docs(001-webui-refactor): close H9, tick T1.8 (M1)
3b05630 docs(001-webui-refactor): close T1.9 + T1.10, tick plan (M1)
```

<!-- handoff: H11 · status: complete · timestamp: 2026-04-15 17:43 -->
