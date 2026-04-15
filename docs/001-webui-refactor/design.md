# Open Interview Web UI 重构设计

- doc_type: design_doc
- status: proposed
- updated_at: 2026-04-15
- scope: `src/app/globals.css`、`src/components/ui/*`、`src/components/workbench/*`、`src/features/workbench/*`、`src/features/*/workbench*.tsx`
- canonical_for: 全站视觉语言、原子组件规范、工作台 shell、7 个 feature 页面的统一设计决策
- target_platform: desktop 为主，最小移动端适配（sidebar 塌成顶部抽屉）
- complexity: L2（两个 phase）

## 1. 背景

当前 Web UI 已经覆盖了 7 个主要页面和核心工作流，功能完整，但在视觉语言层面存在系统性问题：

- **设计语言不统一**：深色靛紫 sidebar (`#1e1b4b`) + 浅紫灰主内容 + radial gradient 背景 + 4 种圆角 (14/18/24/28) 混用，视觉重量分布不规整。
- **按钮编排混乱**：`Button` 组件只有 3 个 variant（primary/secondary/ghost）、1 个 size（h-11=44px），主按钮无 border、次按钮有 1px border，导致同一排按钮几何实际高度不一致。各页面对按钮尺寸、主从关系、摆放位置没有约定。
- **组件编排不遵循产品设计原则**：`PageHeader` 在每个页面都渲染 eyebrow badge + 大 title + 渐变背景 + 4 列 highlights grid，造成首屏重量过高；不同 feature 页面的节奏几乎一致，缺少"我到了一个不同的地方"的空间感。
- **Tokens 没有体系**：颜色、圆角、阴影、间距都是一次性魔术数字，没有形成可被复用、可被 lint 的 token 体系。

这次重构的目标不是增加装饰，而是从 token 层面重建设计系统，并在此之上重构组件和页面布局。

## 2. 设计目标

### 2.1 总目标

把当前"偏 SaaS dashboard"的气质收敛为 **Linear 派冷静极简的专业工作台**：简洁、清新但不失高级，设计语言统一，按钮与组件编排有规范可依。

### 2.2 具体目标

- **统一视觉语言**：建立完整的 tokens 体系（颜色、字体、圆角、阴影、间距、表面层级），砍掉所有魔术数字。
- **解决按钮编排问题**：建立 5 variant × 4 size 的按钮矩阵，所有 variant 几何严格对齐，并提供明确的摆放规则。
- **组件编排规范化**：每个原子组件只做一件事，PageHeader 等工作台组件收缩重量，避免每个页面节奏雷同。
- **支持深色模式**：浅色 + 深色双态，所有 tokens 和组件双态适配。
- **保留所有现有能力与交互流程**：只做视觉/组件/布局层面重构，不变动功能、API、数据模型、导航结构。

## 3. 设计原则

### 3.1 Linear 派冷静极简

纯白底、细 1px 边框、严格字号层级、单色强调（冷蓝 `#2563EB`）、中等偏高的视觉密度。气质参考 Linear、shadcn/ui、Supabase 文档站。

### 3.2 克制优先

能少就少。Tokens 数量尽量少，阴影默认不用（改为 border），动效只保留功能性过渡，装饰元素（渐变、径向 bg、装饰性 badge）能砍则砍。

### 3.3 功能控件退让，内容呼吸

**Header 紧凑 + Body 平衡** 是整体密度策略的核心：页面 header、工具栏、按钮等功能控件用紧凑尺寸；列表、卡片、表单等内容主体用平衡间距，保证阅读呼吸感。

### 3.4 几何严格对齐

所有按钮无论 variant 都带 1px border（透明或同色），保证同一排按钮的高度和盒模型严格一致。这是"按钮编排混乱"的底层修复。

### 3.5 一个语境一个 Primary

每个页面、每个 section、每个 dialog 最多 1 个 Primary 按钮。其他动作用 Secondary / Ghost / Link 降级。Primary 居右（Page Header 右上、Dialog Footer 右下），抢主视觉的争夺战是混乱的首要源头。

### 3.6 每个页面有自己的节奏

Phase 2 重构时，`/practice`（考试/训练工作台）、`/qa`（对话界面）、`/questions`（题库列表）、`/import`（上传表单）应该分别有符合自身主任务的布局节奏，而不是一律用 `PageHeader + DetailGrid + 两列卡片`。

## 4. 范围

### 4.1 本次纳入

- 全站视觉 tokens（颜色、字体、圆角、阴影、间距、表面层级、双色模式）
- 原子 UI 组件重写（`src/components/ui/*`）
- 工作台原子组件重写（`src/components/workbench/*`）
- Shell 层重构（`src/features/workbench/*` 及其对应 layout）
- 7 个 feature 页面布局重构（`src/features/{import,review,questions,practice,interviews,qa,resume}/*`）
- 深色模式支持（含切换器、localStorage 记忆、system 跟随）

### 4.2 本次不纳入

- 业务逻辑、API 契约、数据模型、服务层（`src/server/*`）变更
- 导航结构调整（仍是现有 7 个主入口，顺序不变）
- 任何功能新增或删减
- 完整响应式（只做最小移动端：sidebar 塌成顶部抽屉，主内容区单列，不保证复杂布局在 <768px 的精致度）
- 自定义中文字体加载（中文字体回落系统：PingFang SC / Microsoft YaHei）
- 国际化 / 多语言（暂维持现有中文）

## 5. 全局设计规范

### 5.1 色彩系统

**功能色（6 槽 + soft 变体）：**

| 角色 | 值（浅色） | Soft 变体 | 用途 |
|---|---|---|---|
| Brand / Primary | `#2563EB` | `#EFF6FF` | 主 CTA、激活态、选中态、品牌识别 |
| Success | `#059669` | `#ECFDF5` | 已完成、状态正常 |
| Warning | `#D97706` | `#FFFBEB` | 提醒但非错误 |
| Destructive | `#DC2626` | `#FEF2F2` | 删除、危险操作 |
| Info | `#0284C7` | `#F0F9FF` | 中性信息提示 |
| Foreground | `#09090B` | `#F4F4F5` | 主文字 / 反向表面 |

每个功能色只用**单一档位**（Linear 派不堆 50-950 色阶），需要强弱变化时用 `soft` 变体（作为 badge / chip 背景）或调用 opacity。

**中性灰阶（Tailwind zinc 9 档）：**

`#FAFAFA · #F4F4F5 · #E4E4E7 · #D4D4D8 · #A1A1AA · #71717A · #52525B · #3F3F46 · #18181B`

语义别名（CSS 变量）：

- `--color-background` = zinc-50
- `--color-border` = zinc-200
- `--color-muted-foreground` = zinc-500
- `--color-foreground` = zinc-900

整个系统只用这一套灰阶，杜绝"暖灰 vs 冷灰"混用。

**砍掉：**

- 现有 `--surface-nav #1e1b4b`（深色靛紫侧栏）
- `body` 上的 radial gradient 背景
- `::selection` 的靛紫高亮（改为 Brand 的 soft 变体）

### 5.2 深色模式

深色模式通过根元素 `.dark` 类切换。每个功能色和 neutral 都需要深色变体：

| 角色 | 浅色 | 深色 |
|---|---|---|
| Background | `#FFFFFF` / `#FAFAFA` | `#09090B` / `#18181B` |
| Foreground | `#09090B` | `#FAFAFA` |
| Border | `#E4E4E7` | `#27272A` |
| Muted fg | `#71717A` | `#A1A1AA` |
| Brand | `#2563EB` | `#3B82F6`（深色稍亮以保对比） |
| Soft 变体 | 浅饱和底 | `rgba(brand, 0.12)` 透明叠加 |

切换器：顶栏右侧放一个主题切换 icon 按钮，支持 `system / light / dark` 三态；记忆到 `localStorage.openInterviewTheme`。

### 5.3 字体

- **Sans**：`Inter` + `"PingFang SC"` + `"Microsoft YaHei"` + sans-serif fallback
- **Mono**：`JetBrains Mono` + ui-monospace fallback
- 移除 `IBM Plex Sans / IBM Plex Mono` 依赖，从 `package.json` 删除对应 `@fontsource` 包；保留 `@fontsource/jetbrains-mono`；新增 `@fontsource/inter` 或 variable 字体。

字号层级：

| 角色 | size | weight | line-height |
|---|---|---|---|
| Page title | 16px | 600 | 1.4 |
| Section heading | 14px | 600 | 1.4 |
| Body default | 13px | 400 | 1.55 |
| Body small | 12px | 400 | 1.5 |
| Caption / meta | 11px | 500 | 1.4 |
| Number emphasis | 15-20px | 600 | 1.2 |

关键收缩：现有 PageHeader 的 `text-[1.65rem]~1.8rem (26-29px)` 压到 16px + semibold。去掉 `eyebrow Badge + title` 的固定组合，只留 title + 可选 meta。

### 5.4 密度策略

**Header 紧凑档：**
- Padding: 10-16px（纵/横）
- Title 13px / font-weight 600
- 按钮用 `sm` 档（28px 高）

**Body 平衡档：**
- Row padding: 9-16px
- Font 12-14px / line-height 1.55
- Card padding: 18-20px
- 卡片间距: 16-24px

**一屏呼吸**：去掉 `body` 的 radial gradient 和现有 `main` 的 `gap-5 py-5` 大间距，用平衡档的统一节奏。

### 5.5 圆角

4 档 token：

- `radius-sm` = 4px（chip、tag、inline badge）
- `radius-md` = 6px（button、input、select、small card）
- `radius-lg` = 10px（card、panel、dialog）
- `radius-full` = 999px（avatar、pill badge）

砍掉现有的 14/18/24/28/22/20/16 等自由数值。

### 5.6 阴影与 Elevation

- `shadow-none`（默认）：仅 1px border
- `shadow-sm` = `0 1px 2px rgba(0,0,0,0.04)`：微浮起（卡片 hover 可选）
- `shadow-md` = `0 4px 12px rgba(0,0,0,0.06)`：popover、dropdown、tooltip
- `shadow-lg` = `0 16px 48px rgba(0,0,0,0.12)`：dialog、modal

Linear 派主打用 border 区分层级，阴影只在 overlay（dropdown / popover / dialog）用。

### 5.7 表面层级

只保留 3 层表面，砍掉 `surface-nav` 深色和所有渐变背景：

- `surface` = `#FFFFFF`（默认卡片）
- `surface-muted` = `#FAFAFA`（页面底色、sidebar）
- `surface-subtle` = `#F4F4F5`（嵌套面板、代码块）

### 5.8 间距

沿用 Tailwind 默认 4px 基础 scale（`1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64`），不引入自定义间距 token。

### 5.9 动效

**克制派**（用户选定）：

保留：
- Hover / focus 的颜色与 border 过渡
- Dialog / dropdown 的展开/收起过渡（功能性必需）
- Button 的 `active:scale-[0.98]` 按压反馈
- `@keyframes skeleton-pulse`（骨架屏功能性）
- `.sidebar-tooltip` 行为保留，但实现改走规范的 Tooltip 组件

砍掉：
- `@keyframes fade-in-up` 和 `.reveal-list > *` 入场动画（造成列表渲染抖动）
- `@keyframes radar-draw` 雷达图入场动画（改为静态直接渲染）

统一 timing token：`duration-150 ease-out` 为所有过渡的默认值。

## 6. 按钮规范

### 6.1 Variants（5 个）

| variant | 背景 | 字 | 边框 | 用途 |
|---|---|---|---|---|
| Primary | `brand` | `#FFF` | `brand`（同色） | 主 CTA，每个语境 ≤ 1 个 |
| Secondary | `#FFF` | `fg` | `border` 中性 | 次级动作 |
| Ghost | `transparent` | `fg` | `transparent` | 三级动作、工具栏 |
| Destructive | `destructive` | `#FFF` | `destructive` | 删除 / 危险操作 |
| Link | `transparent` | `brand` | `transparent` | inline 链接气质，不占 button 盒子（无 border、无 min-height） |

**Link variant 不带箭头**：不在文字末尾自动加 `→` 或 `›`（用户明确指定）。

### 6.2 Sizes（4 档）

| size | height | padding | font-size |
|---|---|---|---|
| sm | 28px | 0 10px | 12px |
| md | 34px | 0 14px | 13px |
| lg | 40px | 0 18px | 14px |
| xl | 46px | 0 26px | 14-15px |

- `sm`：工具栏 / PageHeader / FilterBar
- `md`（默认）：表单 submit、Dialog footer
- `lg`：主 CTA、次级空状态
- `xl`：空状态唯一 CTA 场景（独占一行居中）

### 6.3 几何对齐

所有 variant 都有 1px border（透明或同色），保证跨 variant 的按钮总高度严格一致。

### 6.4 摆放规则

1. **一个语境最多 1 个 Primary**。
2. **Primary 居右**（PageHeader 右上、Dialog footer 右端）。
3. **Destructive 不与 Primary 并排**，只和 Ghost "取消" 成对。
4. **同组按钮 gap 6-8px**（sm 用 6px，md/lg 用 8px），跨组用 margin。
5. **Icon-only button**：正方形，边长 = 对应档位高度；必须配 `aria-label`，hover 出 Tooltip。
6. **空状态 CTA**：主按钮用 `xl` 档独占一行居中，次级说明用 Link 放在下面（不横排）。
7. **Disabled** 统一 opacity 50%，不改 geometry。

## 7. 原子组件清单（Phase 1 重写）

### 7.1 `src/components/ui/*`

| 组件 | 现状 | 重写要点 |
|---|---|---|
| `button.tsx` | 3 variant × 1 size，几何不对齐 | 重写：5 variant × 4 size，全部 1px border，`asChild` 支持（Link/next-link 无需 `href` 重载） |
| `badge.tsx` | 4 tone，uppercase tracking | 重写：保留 tone（neutral/accent/success/warning/destructive/info），可选 variant=solid/soft，去掉强制 uppercase |
| `input.tsx` | 现有样式 | 对齐 tokens：h-9/h-10 两档，6px 圆角，focus-ring 用 brand |
| `select.tsx` | 现有样式 | 对齐 Input 同规范 |
| `textarea.tsx` | 现有样式 | 对齐 Input 同规范，min-height 设为 3 行 |
| `skeleton.tsx` | 现有 `skeleton-pulse` | 保留动画，用新的 surface-subtle 色 |
| `surface-card.tsx` | `muted / interactive` 两模 | 重命名为 `Card` 并拆子组件（CardHeader/CardBody/CardFooter），去掉 `interactive-card` CSS 全局类 |

### 7.2 新增

- `tooltip.tsx`：取代全局 `.sidebar-tooltip` CSS
- `dialog.tsx`：为未来 destructive 确认、表单 modal 准备
- `separator.tsx`：替换当前散落的 `<div class="border-t" />`
- `theme-toggle.tsx`：主题切换器（system/light/dark 三态）

### 7.3 `src/components/workbench/*`

| 组件 | 现状 | 重写要点 |
|---|---|---|
| `page-header.tsx` | eyebrow badge + 大 title + 渐变 bg + 4 列 highlights | 瘦身：保留 title 和可选 actions，highlights 列表降格到独立 `StatsRow` 组件（按需使用），砍掉渐变背景和 eyebrow |
| `section-heading.tsx` | 单 title | 保留但对齐字号 token（14px semibold） |
| `empty-list.tsx` | 现有 | 按 §6.4 规则 6 重做（xl 按钮独占一行 + Link 说明） |
| `detail-grid.tsx` | 灰色小卡 4 列 | 瘦身：小数字不再超大，改为均匀 KV pair row，按页面按需使用 |
| `form-field.tsx` | 现有 | 对齐 Input 间距规范 |
| `placeholder-table.tsx` | 现有 | 对齐 skeleton token |

## 8. Shell 层重构

### 8.1 `app-sidebar.tsx`

- **配色**：从深色靛紫 (`bg-surface-nav text-text-inverse`) 改为 `surface-muted + foreground`（浅色底 + 深文字）。
- **简化**：去掉 4 色方块 logo、渐变 logo 卡片、`inset shadow`，用 24-28px 圆角方块 + 文字 wordmark。
- **导航项**：去掉 `border border-white/12`、去掉 `bg-white/10` hover、改为浅色规范（`hover:bg-zinc-100`、`active:bg-zinc-200`、选中态 `bg-brand-soft text-brand`）。
- **折叠**：保留 localStorage 记忆、保留宽度切换动画。
- **Group 分组**：保留 data / learn 分隔（改为 1px border-t + label）。
- **移动端**：原来横向 overflow 的 tab 形式改为顶部抽屉（hamburger 触发）。

### 8.2 `top-bar.tsx`

- **简化**：砍掉 eyebrow "Open Interview" + `"工作台"` + `"本地优先"` 冗余组合；顶栏只保留当前页面面包屑/页标题和**主题切换器 + LLM provider 状态 pill**。
- **sticky 行为**：保留 `sticky top-0 backdrop-blur`，但 border-b 用 `border` token。

### 8.3 `shell.tsx`

- 去掉 `min-h-[calc(100vh-77px)]`（77 是魔术数字），改用 flex 正确撑满。
- 主内容区 `max-w-[1680px]` 保留；`gap-5 py-5 px-4-5` 调整为按密度策略的标准间距。

### 8.4 `layout.tsx`（root）

- 替换 font-import：去 IBM Plex，换 Inter。
- 根元素加 `data-theme` 或 `className="dark"` 承载主题。

## 9. Feature 页面重构（Phase 2）

Phase 2 按优先级逐页重构。每页在 Phase 2 启动时独立补一份**轻量 design note**（一页 markdown，不走完整 design.md 流程），列出该页特定的布局调整。

**优先级（基于用户主要工作流）：**

| 顺序 | 路径 | 现状问题 | 重构方向 |
|---|---|---|---|
| P1 | `/practice` | 左侧长栏过长、雷达图装饰动画、首屏信息重量大 | 顶部总览主卡 + 主舞台 + 右侧最近考试的三段布局 |
| P2 | `/qa` | 会话列表 + ask 表单平铺，缺少对话气泡感 | 聊天气泡形式 + 左侧会话抽屉 |
| P3 | `/questions` | 现有 Header + DetailGrid + filter + list 模板 | 保留骨架但按新密度和组件重绘 |
| P4 | `/review` | 类似 P3 | 同 P3 |
| P5 | `/interviews` | 按来源展示面经 | 左侧来源列表 + 右侧上下文展示 |
| P6 | `/import` | 多个 action panel | 表单主导，step 2 分步感 |
| P7 | `/resume` | 简历 + 项目 + 深挖会话 | 留到最后，结构可能最动 |

## 10. 迁移策略

1. **Phase 1 可独立上线**：tokens + 组件重写完成后，现有页面会自动"换皮"（因为用的都是共享 CSS 变量和 `Button / SurfaceCard` 等组件），即便不做 Phase 2 也能大幅改善视觉。
2. **组件 props 接口兼容**：重写 `Button` 等组件时尽量保留现有 props 签名（`variant / href / children`），必要时新增 `size` prop（默认值等价于现有行为）。不兼容的地方在 PR 里显式列出并同步调用方。
3. **深色模式渐进启用**：tokens 先加 `.dark` 变体，切换器默认 system 跟随；Phase 1 完成后用户可手动切 dark 验收。
4. **Phase 2 逐页独立合并**：每个 feature 页一个 PR，独立验证后合入。
5. **回滚策略**：Phase 1 的 tokens 改动集中在 `globals.css` 和 `components/ui/*`，回滚用 git revert 一步到位。Phase 2 逐页改不互相依赖，单页出问题不影响其他页面。

## 11. 验收标准

### 11.1 Phase 1（基础设施）

- [ ] `db:init` / `typecheck` / `lint` / `build` 全部通过
- [ ] 所有现有页面用新组件渲染无崩坏（视觉 diff 自查）
- [ ] 按钮几何对齐：任意一排按钮实测高度差 ≤ 0
- [ ] 颜色 token 在浅色 / 深色两套完整可用
- [ ] 主题切换器三态切换正常，localStorage 记忆正常
- [ ] 移动端（375px 宽度 viewport）sidebar 塌成抽屉，主区域内容不溢出
- [ ] 砍掉的 `body` radial gradient、`.reveal-list` 动画、`.interactive-card` 全局类等在代码里不再存在

### 11.2 Phase 2（页面重构）

- [ ] 每个 feature 页面的所有动作、数据展示、路由跳转与重构前对等
- [ ] 页面间节奏可感知不同（至少 practice / qa / questions 三类有差异化布局）
- [ ] 统一遵循"一个语境一个 Primary"、"Header 紧凑 Body 平衡"
- [ ] 所有按钮、input、badge 使用新组件，无 inline 样式 hack

### 11.3 整体

- [ ] `AGENTS.md` 里现有的 UI 相关描述保持一致或被 PR 同步更新
- [ ] `docs/reference/ui-flows.md` 若存在 UI 描述也同步更新
- [ ] 新的 tokens 和组件规范在 `AGENTS.md` 或新 `docs/reference/design-system.md` 有入口索引

## 12. 未决事项（留给 Phase 2 时逐页决定）

- `/practice` 雷达图是否保留（保留则需非动画版本；不保留则找替代的能力画像呈现方式）
- `/qa` 对话气泡的具体形态（单列 vs 左右分列 / 是否显示引用 snippet inline）
- 空态插图（当前无插图，Phase 2 是否引入 lucide-based 简笔 illustration）
- 主题切换器按钮是 icon-only 还是带标签

<!-- handoff: H0 · status: complete · timestamp: 2026-04-15 · source: brainstorming-direct -->

