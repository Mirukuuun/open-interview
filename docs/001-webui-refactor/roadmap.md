# Open Interview Web UI 重构 · MVP 实施路线图

- doc_type: roadmap
- status: proposed
- complexity: L2
- updated_at: 2026-04-15
- workstream: `001-webui-refactor`
- git_branch: `feature/001-webui-refactor`
- design_source: [`design.md`](./design.md)
- phases: [`m1-infra`](./m1-infra/), [`m2-feature-pages`](./m2-feature-pages/)

---

## 0. MVP 验收标准

以下清单为 E2E 可验证条目，来源于 `design.md` §11：

**Phase 1 完成判定：**

- [ ] `corepack pnpm db:init` + `typecheck` + `lint` + `build` 全部通过
- [ ] 所有现有 7 个 feature 页面在新组件/新 tokens 下渲染无崩坏（视觉 diff 自查）
- [ ] 任一排按钮（例如 PageHeader 右上角、Dialog footer）跨 variant 实测高度差 ≤ 0
- [ ] 颜色 / 字体 / 圆角 / 阴影 / 表面层级 tokens 在浅色 + 深色两套完整可用
- [ ] 主题切换器三态（system / light / dark）切换正常，`localStorage.openInterviewTheme` 记忆正常
- [ ] 375px 宽度 viewport 下 sidebar 塌成顶部抽屉，主区域不溢出
- [ ] 代码里不再存在 `body` radial gradient、`.reveal-list` 动画、`.interactive-card` 全局类、`--surface-nav` 深色靛紫、IBM Plex 字体引用

**Phase 2 完成判定：**

- [ ] 7 个 feature 页面（practice / qa / questions / review / interviews / import / resume）所有动作、数据展示、路由跳转与重构前对等
- [ ] 页面间节奏可感知不同（至少 practice / qa / questions 三类有差异化布局）
- [ ] 统一遵循"一个语境一个 Primary"与"Header 紧凑 Body 平衡"
- [ ] 所有按钮 / input / badge 使用新组件，无 inline 样式 hack

**整体收口：**

- [ ] `AGENTS.md` 中 UI 相关描述保持一致或被 PR 同步更新
- [ ] `docs/reference/ui-flows.md` 若含 UI 描述同步更新
- [ ] 新 tokens / 组件规范在 `AGENTS.md` 或新 `docs/reference/design-system.md` 有入口索引

---

## 1. 开发顺序原则

1. **基础设施先于页面**：tokens、原子组件、Shell 层稳定后才进入 feature 页面重构。这是本次拆分的核心理由（深色模式影响每一个 token 和组件，若先做页面后加深色会导致所有页面回归一次）。
2. **组件 props 兼容优先**：重写 `Button / Card / Badge` 等组件时保留现有 props 签名（`variant / href / children`），必要时新增 `size` prop 并默认等价于现有行为，避免 Phase 1 合并时页面大面积 breaking。
3. **Phase 1 必须独立可上线**：tokens + 组件重写完成后，7 个现有页面自动"换皮"即获得视觉改善；即便 Phase 2 永不启动，Phase 1 也是一个独立可交付的产物。
4. **Phase 2 逐页独立合并**：每个 feature 页一个 PR（配一份轻量 design note），互不依赖，出问题不影响其他页面。
5. **克制优先**：不新增装饰、不扩展色阶、不引入自定义间距。Tokens 数量尽量少，阴影默认不用（改为 border）。

### 规则豁免声明（与 `planning-roadmap` skill §切 phase 5 原则对齐）

- **豁免 "后端/核心先于前端/边缘"**：本工作流为**纯前端视觉/组件/布局重构**，`design.md` §4.2 明确"本次不纳入业务逻辑 / API 契约 / 数据模型 / 服务层变更"。无后端契约需要先敲定，故此规则不适用。
- **低于 3–7 phase 下限的说明**：本项目拆成 2 个 phase（`m1-infra` + `m2-feature-pages`），低于 skill 通用的 3–7 范围。理由：两 phase 均独立可交付且各自内部粒度已在合理区间（m1 估 4–5 天、m2 估 7–14 天但在其内部再按 7 页逐页 PR 拆分，单页 1–2 天）。brainstorming 阶段已与用户对齐此拆法（代号"X 拆法 · 基础设施优先"），不再重新讨论。

---

## 2. 前置 Spike

**无**。`design.md` 已覆盖全部关键设计决策（tokens 体系、按钮矩阵、原子组件清单、Shell 重构要点、深色模式映射、7 页优先级），无需额外技术探索。未决事项（`design.md` §12）均属 Phase 2 逐页决定，不构成 Phase 1 启动阻塞。

---

## 3. 里程碑总览

| 里程碑 | slug | 主题 | 目录 | 前置依赖 | 状态 | 估算 |
|---|---|---|---|---|---|---|
| M1 | `m1-infra` | 全站 design tokens + 原子组件重写 + Shell 层重构 + 深色模式支持 | [`m1-infra/`](./m1-infra/) | — | `- [ ]` 未开始 | 4–5 天 |
| M2 | `m2-feature-pages` | 7 个 feature 页面按优先级逐页重构（practice → qa → questions → review → interviews → import → resume） | [`m2-feature-pages/`](./m2-feature-pages/) | M1 完成并合并 | `- [ ]` 未开始 | 7–14 天（单页 1–2 天 × 7） |

### Phase 依赖图

```
[M1 · m1-infra]  ──(tokens + 组件 + Shell 稳定)──▶  [M2 · m2-feature-pages]
     │                                                        │
     ├─ 独立可上线（页面自动换皮）                             ├─ 逐页独立 PR
     └─ 合并门槛：db:init + typecheck + lint + build           └─ 每页补轻量 design note
```

---

## 4. M1 · `m1-infra` · 基础设施层

- [ ] **状态**：未开始
- **目录**：`docs/001-webui-refactor/m1-infra/`
- **估算**：4–5 天
- **前置依赖**：无（`design.md` 已就绪）

### 4.1 目标

建立全站统一的 design tokens 体系，重写所有原子 UI / workbench 组件，重构 Shell 层（sidebar / topbar / shell / root layout），并完整支持浅色 + 深色双态。产出一个**独立可上线**的视觉基础设施层：现有 7 个 feature 页面不改布局，仅通过共享 tokens 和重写组件自动"换皮"。

### 4.2 范围

**纳入（对应 `design.md` §5 §6 §7 §8）：**

- **全局视觉规范（§5）**
  - 色彩系统：6 槽功能色 + soft 变体、Tailwind zinc 9 档中性灰阶、语义别名 CSS 变量（`--color-background / --color-border / --color-muted-foreground / --color-foreground`）
  - 砍掉：`--surface-nav` 深色靛紫、`body` radial gradient、`::selection` 靛紫高亮
  - 深色模式：`.dark` 根类切换 + 每个功能色/neutral 深色变体 + `localStorage.openInterviewTheme` 记忆 + system/light/dark 三态
  - 字体：移除 IBM Plex（`@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono` 从 `package.json` 删除），新增 Inter（`@fontsource/inter` 或 variable 字体），保留 JetBrains Mono
  - 字号层级：Page title 16px / Section heading 14px / Body 13px 等 6 档
  - 密度策略：Header 紧凑档（padding 10–16px / 按钮 sm 28px 高） + Body 平衡档（row padding 9–16px / card padding 18–20px / 卡片间距 16–24px）
  - 圆角 4 档 token：`radius-sm 4px / radius-md 6px / radius-lg 10px / radius-full 999px`，砍掉 14/18/24/28/22/20/16 等自由数值
  - 阴影 4 档：`shadow-none / sm / md / lg`，border 为主、阴影只在 overlay 用
  - 表面层级 3 档：`surface / surface-muted / surface-subtle`，砍 surface-nav 深色 + 所有渐变背景
  - 动效克制派：保留 hover/focus/dialog/press/skeleton 过渡；砍 `@keyframes fade-in-up` `.reveal-list` `@keyframes radar-draw`；统一 timing token `duration-150 ease-out`
- **按钮规范（§6）**
  - 5 variants：Primary / Secondary / Ghost / Destructive / Link（Link 不带箭头）
  - 4 sizes：sm 28 / md 34 / lg 40 / xl 46
  - 所有 variant 带 1px border（透明或同色）保证几何严格对齐
  - 摆放规则：一个语境 ≤ 1 Primary、Primary 居右、Destructive 不与 Primary 并排、gap 6–8px、icon-only 方形 + aria-label + Tooltip、空状态 xl 独占一行 + Link 说明、disabled 仅降 opacity 不改几何
- **原子 UI 组件（§7.1 + §7.2）**
  - 重写：`button.tsx` / `badge.tsx` / `input.tsx` / `select.tsx` / `textarea.tsx` / `skeleton.tsx` / `surface-card.tsx`（重命名为 `Card` 并拆 `CardHeader / CardBody / CardFooter`，去掉 `interactive-card` 全局类）
  - 新增：`tooltip.tsx`（取代 `.sidebar-tooltip` CSS） / `dialog.tsx` / `separator.tsx` / `theme-toggle.tsx`
- **工作台原子组件（§7.3）**
  - 重写：`page-header.tsx`（瘦身：只留 title + 可选 actions，highlights 降格到新独立 `StatsRow` 组件，砍渐变背景 + eyebrow badge）/ `section-heading.tsx` / `empty-list.tsx` / `detail-grid.tsx`（改为均匀 KV pair row） / `form-field.tsx` / `placeholder-table.tsx`
- **Shell 层（§8）**
  - `app-sidebar.tsx`：改浅色底 + 深文字；去掉 4 色方块 logo + 渐变 logo 卡片 + inset shadow；导航项改 `hover:bg-zinc-100 / active:bg-zinc-200 / 选中 bg-brand-soft text-brand`；保留折叠记忆；移动端 overflow tab 改顶部抽屉
  - `top-bar.tsx`：砍 eyebrow + "工作台" + "本地优先" 冗余；只保留面包屑 + 主题切换器 + LLM provider 状态 pill；`sticky top-0 backdrop-blur` 保留
  - `shell.tsx`：去掉 `min-h-[calc(100vh-77px)]` 魔术数字改 flex 撑满；`max-w-[1680px]` 保留；间距按密度策略调
  - `layout.tsx` root：替换 font-import（去 IBM Plex 换 Inter）；根元素加 `data-theme` 或 `className="dark"`

**不纳入（留给 M2）：**

- 任何 `src/features/{import,review,questions,practice,interviews,qa,resume}/*` 下 feature 页面的布局调整
- 页面级节奏差异化（practice 三段布局 / qa 聊天气泡 / interviews 左右分栏 等）
- 每页 Phase 2 design note

**不纳入（整个工作流都不纳入，对齐 `design.md` §4.2）：**

- 业务逻辑 / API 契约 / 数据模型 / `src/server/*` 变更
- 导航结构调整（仍是现有 7 主入口，顺序不变）
- 功能新增或删减
- <768px 以下复杂布局精致度
- 自定义中文字体加载（回落系统字体：PingFang SC / Microsoft YaHei）
- 国际化 / 多语言

### 4.3 关键里程碑（内部 checkpoint）

1. Tokens 层落地：`globals.css` 新 CSS 变量 + Tailwind theme 配置 + 深色 `.dark` 变体完整
2. 原子 UI 组件（`src/components/ui/*`）全部重写通过 typecheck
3. 工作台原子组件（`src/components/workbench/*`）全部重写并通过 typecheck
4. Shell 层（sidebar / topbar / shell / layout）重构完成，7 个现有页面肉眼可跑
5. 深色模式三态切换器 + localStorage 记忆联调通过
6. 合并门槛：`db:init + typecheck + lint + build` 全绿 + 视觉 diff 自查 + 移动端 375px 自查

### 4.4 验收条件

对应 §0 中 **Phase 1 完成判定** 的 7 条 checkbox 全部通过。补充：

- 砍掉的代码路径在 git diff 中可见（不仅是覆盖，而是真的删除）：`body` radial gradient / `.reveal-list` / `@keyframes fade-in-up` / `@keyframes radar-draw` / `.interactive-card` / `--surface-nav` / IBM Plex `@fontsource` 依赖
- 组件 props 不兼容点在 plan 阶段识别并在 PR description 显式列出同步调用方

### 4.5 Risks

| 风险 | 影响 | 缓解 |
|---|---|---|
| `Button` props 签名变更打断下游调用方 | Phase 1 合并时大面积 typecheck 红 | 保持 `variant / href / children` 签名、新增 `size` prop 默认等价现有行为、PR 前全仓 grep 调用点 |
| 深色模式 tokens 映射有盲区（图表/雷达图/skeleton 动画用色） | 深色下视觉崩坏 | 每个砍/留的 CSS 资源逐一双态验收，chart 组件在 plan 阶段单独列 task |
| Shell 层 `min-h-[calc(100vh-77px)]` 魔术数字替换为 flex 后出现滚动容器错位 | 移动端 / 短屏幕滚动异常 | plan 阶段用浏览器 devtools 在 375 / 1280 / 1920 三档 viewport 自查 |
| 字体替换（Inter 引入、IBM Plex 移除）影响首屏 FOUT/FOIT | 首屏闪烁或字体错位 | 用 `@fontsource/inter` variable 版本 + `font-display: swap`；layout.tsx 中 next/font 配置验证 |
| 组件重写引入 accessibility 回归（aria-label / focus ring 丢失） | 键盘导航 / 屏幕阅读器体验退化 | 所有 icon-only button 强制 aria-label；focus-ring 用 brand 色且默认开启；plan 阶段加单独 a11y task |

---

## 5. M2 · `m2-feature-pages` · 7 个 feature 页面逐页重构

- [ ] **状态**：未开始
- **目录**：`docs/001-webui-refactor/m2-feature-pages/`
- **估算**：7–14 天（每页 1–2 天 × 7 页，独立 PR）
- **前置依赖**：M1 (`m1-infra`) 完成并合并到本 feature 分支

### 5.1 目标

在 M1 基础设施稳定之上，对 7 个 feature 页面逐页进行布局节奏重构，让不同主任务（考试 / 对话 / 题库 / 面经 / 上传 / 简历）呈现可感知的差异化布局，摆脱当前"一律 PageHeader + DetailGrid + 两列卡片"的雷同节奏。每页独立交付、独立合并。

### 5.2 范围

**纳入（对应 `design.md` §9 的 7 个页面，按 P1–P7 优先级顺序）：**

| 顺序 | 页面路径 | 源文件区域 | 重构方向（摘自 §9） |
|---|---|---|---|
| P1 | `/practice` | `src/features/practice/*` | 顶部总览主卡 + 主舞台 + 右侧最近考试的三段布局；处理雷达图装饰动画（保留则改非动画版 / 不保留则换能力画像呈现） |
| P2 | `/qa` | `src/features/qa/*` | 聊天气泡形式 + 左侧会话抽屉；确定气泡形态（单列 vs 左右 / 引用 snippet inline 与否） |
| P3 | `/questions` | `src/features/questions/*` | 保留 Header + filter + list 骨架，按新密度和组件重绘 |
| P4 | `/review` | `src/features/review/*` | 同 P3 |
| P5 | `/interviews` | `src/features/interviews/*` | 左侧来源列表 + 右侧上下文展示 |
| P6 | `/import` | `src/features/import/*` | 表单主导，step 2 分步感，多个 action panel 收敛 |
| P7 | `/resume` | `src/features/resume/*` | 留到最后，结构可能最动（简历 + 项目 + 深挖会话的关系重排） |

**每页启动时产物（在 `m2-feature-pages/` 下）：**

- 一份轻量 design note（一页 markdown，不走完整 design.md 流程），列出该页特定的布局调整、按钮摆放、空态方案
- 该页对应 `planning-phase` 产物（main plan + tasks）

**不纳入（与 M1 不重叠）：**

- 全局 tokens / 原子组件 / Shell 层变更（M1 领地；Phase 2 只消费不修改）
- 任何业务逻辑 / API / 数据模型变更（同全局不纳入）
- 非本工作流列入的新 feature 页面

### 5.3 关键里程碑（内部 checkpoint）

每页独立成一个 PR，里程碑按 P1 → P7 顺序推进：

1. **P1 `/practice`** 独立 PR 合并
2. **P2 `/qa`** 独立 PR 合并
3. **P3 `/questions`** 独立 PR 合并
4. **P4 `/review`** 独立 PR 合并
5. **P5 `/interviews`** 独立 PR 合并
6. **P6 `/import`** 独立 PR 合并
7. **P7 `/resume`** 独立 PR 合并
8. 全部合并后整体收口：`AGENTS.md` + `docs/reference/ui-flows.md`（若含 UI）同步更新 + 新 design-system 入口索引补齐

### 5.4 验收条件

对应 §0 中 **Phase 2 完成判定** 的 4 条 checkbox 全部通过。补充：

- 每页 PR 中附视觉 diff 截图（重构前 vs 重构后）
- 每页 PR 中附该页所有动作 / 路由 / 数据展示的自测清单，确认与重构前对等
- 每页合并前独立运行 `db:init + typecheck + lint + build`
- 整体收口后，`design.md` §12 未决事项（雷达图去留 / qa 气泡形态 / 空态插图 / 主题切换器 label）均已闭环

### 5.5 Risks

| 风险 | 影响 | 缓解 |
|---|---|---|
| 7 页逐页推进中 M1 的原子组件发现缺口需回改 | 打断 Phase 2 节奏，M1 需要补丁 PR | P1 `/practice` 作为"灯塔页"优先暴露缺口；允许 M1 补丁 PR 但不扩大 M1 范围 |
| 每页轻量 design note 过于简陋导致布局返工 | 单页多轮返工拖慢整体 | note 最小覆盖：目标 + 布局骨架 + 按钮摆放 + 空态 + 明确不做项；不强制走完整 design flow |
| 页面差异化节奏与设计系统"统一感"冲突 | 给用户"东一块西一块"的观感 | 差异仅限布局骨架；tokens / 按钮 / 卡片 / 字号 / 间距全部沿用 M1 统一规范，靠节奏差异而非元素差异制造区分 |
| `/resume` 结构动得最大可能需要回补 design | P7 单页失控 | P7 启动前独立判定是否需要升级为独立小 design doc；若是则不阻塞 P1–P6 合并 |
| 各页 PR 并行可能出现 merge conflict（共享 Shell / layout 文件） | 合并顺序依赖出现 | 明确每页 PR 只动自己 `src/features/<page>/*`；碰到 Shell 改动必须先合入 M1 补丁 |

### 5.6 task-type 豁免声明

- **测试 task 类**：本 phase 每页以**视觉 diff 自查 + 动作/路由对等自测清单**替代单元测试（对齐 `design.md` §4.2 "不做业务逻辑变更"，没有新逻辑路径需要单测）。若某页在重构中顺带发现业务 bug，修 bug 走独立 bugfix 工作流，不混入本 phase。
- **部署/发布 task 类**：每页独立 PR 即为其交付物；无额外部署步骤（沿用主干 `deploy:mvp` 流程，由主 Agent 在整体收口时触发）。

---

## 6. 风险登记（跨 phase 汇总）

| ID | 风险 | 来源 phase | 影响 | 触发概率 | 缓解策略 |
|---|---|---|---|---|---|
| R1 | 组件 props 签名变更导致 Phase 1 合并时下游大面积 typecheck 红 | M1 | 中 | 中 | 保持现有 props 签名，新增 `size` 默认值等价现有行为；plan 阶段全仓 grep |
| R2 | 深色模式在图表 / skeleton / 动画资源有盲区 | M1 | 中 | 中 | 双态逐资源验收，chart 单独列 task |
| R3 | 字体替换引入首屏 FOUT/FOIT | M1 | 低 | 低 | `font-display: swap` + variable 字体 |
| R4 | `/resume` 结构动得最大可能超出"重构"范畴 | M2 (P7) | 中 | 中 | P7 启动前独立判定是否升级为小 design doc |
| R5 | 7 页 PR 并行在 Shell 层产生 merge conflict | M2 | 低 | 低 | 每页只动自己目录；Shell 改动强制回 M1 补丁 |
| R6 | Phase 2 页面节奏差异与系统统一感冲突 | M2 | 中 | 低 | 差异只在布局骨架，元素规范统一 |
| R7 | brainstorming 拆法只有 2 phase，低于 skill 3–7 下限 | roadmap 自身 | 低 | 已发生 | 本文件 §1 已显式豁免声明；每 phase 内部粒度在 2–5 天区间 |
| R8 | `design.md` §12 未决事项（雷达图 / 气泡形态 / 空态插图 / 主题切换器 label）可能在 Phase 2 产生 scope creep | M2 | 低 | 中 | 每个未决仅在对应页面启动时在该页 design note 内闭环，不反向影响 M1 |

---

<!-- handoff: H1 · status: complete · timestamp: 2026-04-15 12:19 -->
