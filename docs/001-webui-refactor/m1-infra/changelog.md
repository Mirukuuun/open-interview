# m1-infra · changelog

关闭日期：2026-04-15

## 交付物

- **Tokens 层**（`src/app/globals.css`）：30+ CSS 变量浅色 `:root` + 深色 `.dark` 双态 + `@theme inline` 映射；完整覆盖 typography / neutrals / surfaces / functional colors(5×soft) / radii / shadows / motion。
- **原子 UI**（`src/components/ui/*.tsx`）：重写 7 个（`button` / `badge` / `input` / `select` / `textarea` / `skeleton` / `surface-card`+`card`）、新增 4 个（`tooltip` / `dialog` / `separator` / `theme-toggle`+`theme-provider`）。
- **工作台原子组件**（`src/components/workbench/*.tsx`）：重写 6 个（`page-header` / `section-heading` / `empty-list` / `detail-grid` / `form-field` / `placeholder-table`）+ 新增 `stats-row`。
- **Shell 层**（`src/features/workbench/{app-sidebar,top-bar,shell}.tsx` + `src/app/(workbench)/layout.tsx` + `src/app/layout.tsx`）：浅色底 sidebar + 瘦身 topbar + 去 `calc(100vh-77px)` 魔术数字 + root layout 承载字体和主题类。
- **字体依赖**（`package.json`）：移除 `@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono`，新增 `@fontsource/inter` variable；保留 `@fontsource/jetbrains-mono`。
- **测试套件**：新增 7 个组件测试（`fonts-swap` / `button` / `atomic-ui` / `card-and-new-ui` / `theme-toggle` / `workbench-atoms` / `shell-smoke`）；全仓 18 文件 / 83 cases PASS。
- **文档**：`m1-infra/report.md`（phase 完成报告）、`docs/reference/design-system.md`（canonical UI 参考）、`AGENTS.md` 索引 design-system.md。

## 主要变更

- **视觉体系**：从"靛紫深色装饰派"切换到"Linear 派浅色克制派"：砍掉 `body` radial gradient / `--surface-nav` 深色靛紫 / `@keyframes fade-in-up` / `.reveal-list` / `.interactive-card` / `@keyframes radar-draw` / `.sidebar-tooltip`（grep CLEAN 逐条验证）。
- **深色模式基础设施**：`ThemeProvider`（`openInterviewTheme` localStorage 记忆 + system/light/dark 三态）+ `ThemeToggle`（顶栏 icon-only 循环），配合 `<head>` 注入 bootstrap IIFE 消除首屏闪烁。
- **按钮几何对齐**：5 variants × 4 sizes（sm 28 / md 34 / lg 40 / xl 46），全 variant 统一 1px border，同排按钮跨 variant 高度严格一致。
- **Tailwind v4 接入**：放弃旧 `tailwind.config.ts`，改用 `@theme inline` 块驻留在 `globals.css`。
- **Button 默认 size 收敛**：114 处调用从旧 `h-11=44px` 收缩到新默认 `md=34px`（对齐 design.md §3.3 "Header 紧凑"），0 处需要显式传 size。

## 偏差 / 经验

- **已知 cosmetic 退化归 M2**（`roadmap.md §4.4` 已登记为"已知取舍"）：`.interactive-card` hover 10 处（qa 5 + resume 5） / `.reveal-list` 5 处（qa 3 + import 1 + practice 1） / `radar-draw` 1 处（practice）/ 旧 token 类名 `border-border-strong` 等 430 处 / 37 文件；feature 源码 typecheck 全绿，静态渲染不崩坏，仅 hover 动画 / 入场动画丢失；M2 逐页重构时一次性清除。详见 `m1-infra/report.md` §4。
- **T1.10 buffer 空跑**：T1.9 回归 sweep 首次即全绿，无新增修复；记 closure marker `<!-- closure: T1.10 · status: no-issues-encountered · closed_by: main-agent · timestamp: 2026-04-15 20:05 -->`。
- **7 条 Phase 1 验收 checkbox 状态**：3 条工具链/代码审计项可由 SubAgent 直接勾（#1 / #4 / #7），4 条浏览器手动项（#2 / #3 / #5 / #6）留 `[ ]` 并以 HTML 注释标注 "见 m1-infra/tests/T1.9-regression-report.md 待用户手动验收"；源码层与单测层全部 PASS。
- **Build 阶段 NFT warning 1 条**（`next.config.ts → src/server/db/paths.ts` 的 `process.cwd()` 动态追踪）属既有 server-side 技术债，非本次 UI 重构引入，不阻塞 Phase 1；后续独立服务端任务消除。
- **`PageHeader.eyebrow` / `SurfaceCard.interactive`**：签名保留但行为 no-op，JSDoc 标 `@deprecated`；1 处 `qa-workbench.tsx:57` 传 `eyebrow` 被静默忽略，M2 清理。

## Phase 范围说明

- 本 phase 为 L2 首 phase，workstream `001-webui-refactor` 未 close（M2 `m2-feature-pages` 尚未启动）
- `docs/dev-info/INDEX.md` status 仍 `active`（不改）
- 本 changelog 仅作 phase 级交付凭证；feature-level changelog 留待 M2 完成后整体收口时追加

<!-- closure: m1-infra · status: complete · closed_by: SubAgent(closing-phase) · timestamp: 2026-04-15 -->
