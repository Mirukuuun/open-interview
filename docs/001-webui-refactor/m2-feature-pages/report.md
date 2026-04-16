---
doc_type: phase_report
status: complete
phase: m2-feature-pages
workstream: 001-webui-refactor
completed_at: 2026-04-16
git_branch: feature/001-webui-refactor
---

# M2 · m2-feature-pages · Phase 完成报告

> 来源汇总：`design.md §§9/11.2/12` · `roadmap.md §5` · `m2-feature-pages/plan.md` · `m2-feature-pages/tasks/T2.1–T2.10` · `m1-infra/report.md` · git log（commits `fb07583 … 3a80dd4`）。

本报告作为 M2 phase 的一次性对外交付物，供 workstream `001-webui-refactor` 收口 / 未来恢复会话的 Agent 快速对齐 M2 成果，不必回读 10 个 task 文件与 11 份 handoff。

---

## 1. 实际交付物

M2 在 M1 基础设施（tokens + 原子组件 + Shell）稳定之上，对 7 个 feature 页面按 P1→P7 顺序逐页重构，全部落盘在 `feature/001-webui-refactor` 分支，7 个 feature commit 工具链全绿（见 §2）。

### 1.1 7 页变更摘要

| # | 页面 | commit | 范围 | 清理量 |
|---|---|---|---|---|
| P1 | `/practice` | `fb07583` | 三段布局（顶部总览 + 主舞台 + 右侧最近考试） | `radar-draw` 1 + `reveal-list` 1 + 旧 token 类名 63 处 / 8 文件 |
| P2 | `/qa` | `6d54ea7` + `2ac8cc0` | 左侧会话抽屉 + 右侧单列气泡聊天主区；T2.2 分两 commit：cleanup（H3）+ layout fix（H4）补回 sidebar+chat flex + PageHeader | `interactive-card` 5 + `reveal-list` 3 + 内联 `radial-gradient` 1 + `eyebrow=` 1 + 旧 token 类名 92 处 / 5 文件 |
| P3 | `/questions` | `a6c3471` | 保留 Header + filter + list 骨架，按新密度（Header 紧凑 / Body 平衡）重绘 | 旧 token 类名 42 处 / 2 文件 |
| P4 | `/review` | `47ad573` | 保留队列 / 详情骨架，按新密度重绘；`review-confirm-dialog` 消费 M1 `Dialog` | 旧 token 类名 72 处 / 6 文件 |
| P5 | `/interviews` | `e601cd1` | 左侧来源列表 + 右侧详情展示的分栏布局 | 旧 token 类名 48 处 / 3 文件 |
| P6 | `/import` | `bfb0ca9` | 表单主导 + step 2 分步感 + action panel 收敛 | `reveal-list` 1 + 旧 token 类名 32 处 / 3 文件 |
| P7 | `/resume` | `3a80dd4` | 三层导航(简历 → 项目 → 深挖会话)；深挖会话复用 T2.2 单列气泡风格 | `interactive-card` 5 + 旧 token 类名 81 处 / 10 文件 |

### 1.2 合计清理指标

- **废弃装饰类**：`interactive-card` 10 处（T2.2 qa 5 + T2.7 resume 5）+ `reveal-list` 5 处（T2.1 practice 1 + T2.2 qa 3 + T2.6 import 1）+ `radar-draw` 1 处（T2.1 practice）+ 内联 `radial-gradient` 1 处（T2.2 qa）= **17 处**。全部来自 `m1-infra/report.md §4` 登记的"已知 cosmetic 退化"，M2 一次性清除。
- **废弃 props**：`eyebrow=` 1 处（T2.2 qa-workbench.tsx:57，对应 `m1-infra/report.md §3.4` 的 PageHeader `@deprecated no-op` props）。
- **旧 token 类名**：7 页合计 **430 处 / 37 文件**（P1 63 + P2 92 + P3 42 + P4 72 + P5 48 + P6 32 + P7 81），替换为 `--color-*` 语义变量（`border-[color:var(--color-border)]` / `text-[color:var(--color-muted-foreground)]` / `text-[color:var(--color-foreground)]` / `bg-[color:var(--color-brand-soft)]` / `text-[color:var(--color-brand)]`）。对应 `m1-infra/report.md §4(d)` 登记的 430 处全量闭环。
- **新增测试**：7 份 `tests/<page>-page.test.tsx`（每页一份废弃类名 grep-absent 冒烟测试，构成 T2.1–T2.7 的 TDD Step 1-4 载体）；T2.8 无新增测试文件（纯验证性质）。

### 1.3 页面间节奏差异化落点

对应 `plan.md §验收标准` 第 2 条"页面间节奏可感知不同（至少 practice / qa / questions 三类有差异化布局）"：

| 节奏类别 | 页面 | 布局骨架 |
|---|---|---|
| 三段总览 | `/practice` | 顶部 OverviewCard + 主舞台 Card + 右侧最近考试 Card |
| 对话分栏 | `/qa` / `/resume/projects/*/session/*` | 左侧会话抽屉 + 右侧单列气泡流 |
| 列表浏览 | `/questions` / `/review` | 紧凑 PageHeader + filter + Card 列表 |
| 主从分栏 | `/interviews` | 左侧来源列表（280px）+ 右侧详情区 |
| 表单引导 | `/import` | Step 指示器 + 主表单 Card + 底部 action bar |
| 渐进展开 | `/resume` 三层 | list → detail → project → session 四级 drill-down |

差异仅限布局骨架；tokens / 按钮 / 卡片 / 字号 / 间距统一来自 M1，对应 `roadmap.md §5.5` R-M2-03 风险缓解。

---

## 2. 规格符合度（对照 `plan.md §验收标准` Phase 级 11 条）

T2.8 回归验证（由主 Agent 直接执行）确认工具链与 grep-clean 全部 PASS。

| # | 验收 checkbox | 状态 | 证据 |
|---|---|---|---|
| 1 | 7 个 feature 页面动作 / 数据展示 / 路由跳转与重构前对等 | ✓ 源码层 PASS / 视觉层待用户手动 | T2.1–T2.7 每页 SubAgent report 的"动作/路由对等自测清单"已逐页列出；视觉 diff 需用户浏览器验收 |
| 2 | 页面间节奏可感知不同（practice / qa / questions 三类有差异化） | ✓ | 本报告 §1.3 已列出 6 个节奏类别；practice 三段、qa 对话分栏、questions 列表浏览三种节奏在 design note 与实现中均成立 |
| 3 | 统一遵循"一个语境一个 Primary"与"Header 紧凑 Body 平衡" | ✓ | 每页 design note §3 "按钮摆放" 显式列出单一 Primary 规则；Header 紧凑 `px-4 py-3` 密度来自 M1 `PageHeader` 重写，M2 直接消费 |
| 4 | 所有按钮 / input / badge 使用 M1 新组件，无 inline 样式 hack | ✓ | T2.1–T2.7 每页 task §涉及文件列出消费的 M1 组件（`Button` / `Card` / `Badge` / `PageHeader` / `EmptyList` / `DetailGrid`）；典型 commit（如 `47ad573`）diff stat 显示 tsx 文件变动均为类名替换而非重引入原生 `<button>` |
| 5 | `src/features/**` 全局 grep CLEAN（`interactive-card` / `reveal-list` / `radar-draw` / 旧 token 类名 × 5 / `bg-accent` / `text-accent` / `eyebrow=`） | ✓ | T2.8 回归 sweep 的 grep 逐条 0 hits；T2.10 buffer "no issues encountered" 佐证；7 份 `tests/<page>-page.test.tsx` 在 CI 中对每一页断言 grep-absent |
| 6 | `design.md §12` 未决事项全部闭环（雷达图 / qa 气泡 / 空态插图 / 主题切换器 label） | ✓ | 见本报告 §4；4 个未决在对应页面 design note 中闭环 |
| 7 | `AGENTS.md` UI 描述保持一致或被同步更新 | ✓ | AGENTS.md 无页面级 UI 布局描述（仅 directory 级提及 + 行 63 索引 `design-system.md`），M2 后无需同步；见本报告 §5 偏差 |
| 8 | `docs/reference/ui-flows.md` 若含 UI 描述同步更新 | ✓ | ui-flows.md 为路由 / 交互契约文档（routes、data deps、page states、功能性 ASCII 布局），M2 未改路由与交互契约；其 ASCII 布局骨架与 M2 实现一致（如 `/practice` top-overview + workspace + history、`/qa` 2-region chat、`/interviews` list + detail）；无需同步；见本报告 §5 |
| 9 | 新 tokens / 组件规范在 `AGENTS.md` 或 `docs/reference/design-system.md` 有入口索引（M2 验证 M1 交付持续有效） | ✓ | `AGENTS.md:63` 索引 `docs/reference/design-system.md` 为 canonical UI 规范，链接有效；M2 未补充新规范（`design-system.md` 的 tokens / 组件 / 按钮 / 深色 / 反模式 5 段对 M2 全适用） |
| 10 | `corepack pnpm db:init + typecheck + lint + build` 全部通过（T2.8） | ✓ | T2.8 回归 sweep PASS；本 task 再次验证 typecheck + lint（见 §6 执行记录） |
| 11 | 每页 PR 合并前独立运行 `db:init + typecheck + lint + build` 均 PASS | ✓ | 每页 task 验收条件硬要求；7 个 feature commit 合入前各自跑过工具链，且 T2.8 合流后再跑一遍（PASS） |

整体：11 条 checkbox **全部 PASS**（#1 的浏览器视觉 diff 属 T2.8 规定的用户手动项，与 M1 相同 SubAgent 限制）。

---

## 3. 关键决策汇总

来源：T2.1–T2.7 每页 design note 与 `design.md §12` 未决闭环登记。

### 3.1 `/practice` 雷达图决策（T2.1）

- **选项**：A 保留静态 / B 替换为能力画像 KV（`practice-profile-grid`）
- **决策**：**A 保留静态**。去 `practice-radar-chart.tsx:156` 的 `style={{ animation: "radar-draw 900ms ease-out forwards" }}`；SVG 主体保留；`@keyframes radar-draw` 全局 CSS 已在 M1 删（`m1-infra/report.md §4(c)`），不再"画出来"，静态显示。
- **理由**：`design.md §9 P1` 明确"能力画像"是 `/practice` 的核心洞察工具；SVG 结构可读性已满足，无需替换；保留静态符合 `roadmap.md §1` 克制优先原则。
- **落点**：commit `fb07583`。

### 3.2 `/qa` 气泡形态决策（T2.2）

- **选项**：(a) 单列 vs 左右分列 / (b) 引用 snippet 是否 inline
- **决策**：
  - (a) **单列**。用户提问右对齐 + AI 回复左对齐。
  - (b) **inline 折叠**。引用 snippet 作为回复正文的一部分，默认 `<details>` 折叠。
- **理由**：
  - QA 场景为 1:1 对话（无多人参与），左右分列浪费水平空间且增加视觉跳跃；单列上下排列更符合"对话流"阅读节奏。
  - inline 折叠保持对话流紧凑性，同时保留用户追溯引用来源的能力；与"不要把 debug 信息堆成固定布局"的 `ui-flows.md §3.8` 契合。
- **落点**：commit `6d54ea7`（cleanup）+ `2ac8cc0`（sidebar+chat flex 布局补回）。

### 3.3 空态插图决策（T2.1，后续页面延续）

- **选项**：A 不引入 / B 引入 `lucide`-based 简笔 illustration
- **决策**：**A 不引入**。所有空态用 `EmptyList` 组件（标题 + 描述 + `xl` Primary + 可选 Link），仅可选 `icon?: LucideIcon` 作轻量视觉标记。
- **理由**：`design.md §5.9` 克制派动效 / 装饰基调；`roadmap.md §1` 克制优先；插图会增加色阶选择与主题适配成本，对"本地工具"定位非必要。
- **落点**：T2.1 确立，T2.2–T2.7 无例外延续；所有 `EmptyList` 消费点均未引入 illustration prop。

### 3.4 主题切换器 label 决策（M1 已实现，M2 无变更）

- **选项**：A icon-only / B 带文字 label
- **决策**：**A icon-only**。M1 `ThemeToggle` 已实现 icon-only 三态循环（`system → light → dark → system`），`aria-label` 动态更新（"当前 XXX 主题，点击切换到 YYY"）。
- **理由**：顶栏空间紧凑（`m1-infra/report.md §1.3` shell 层已去 eyebrow + "工作台" + "本地优先"），icon-only 符合 Linear 派克制基调；aria-label 满足可访问性。
- **落点**：M1 commit `776e2b8`；M2 无需变更，此条在 M1 close 时即闭环，本 phase 仅"确认无需加 label"。

---

## 4. `design.md §12` 未决事项闭环汇总

| # | `design.md §12` 条目原文 | 闭环 task | 闭环状态 | 决策 |
|---|---|---|---|---|
| 1 | `/practice` 雷达图是否保留（保留则需非动画版本；不保留则找替代的能力画像呈现方式） | T2.1 | ✓ closed | **保留静态**；去 `radar-draw` animation，SVG 主体保留 |
| 2 | `/qa` 对话气泡的具体形态（单列 vs 左右分列 / 是否显示引用 snippet inline） | T2.2 | ✓ closed | **单列**（用户右 / AI 左对齐）；引用 snippet **inline 折叠**（`<details>`） |
| 3 | 空态插图（当前无插图，Phase 2 是否引入 lucide-based 简笔 illustration） | T2.1 | ✓ closed | **不引入**；保持克制，`EmptyList` 仅可选 `icon` prop；T2.2–T2.7 延续 |
| 4 | 主题切换器按钮是 icon-only 还是带标签 | M1（T1.3） | ✓ closed（M1 时已落实） | **icon-only 三态循环**（`ThemeToggle`，`m1-infra/report.md §1.2`）；M2 无需加 label，此条 M2 显式"无变更"确认闭环 |

4 条未决事项全部闭环，无遗留。

---

## 5. 偏差 / 经验

### 5.1 T2.10 Buffer `no-issues-encountered` 闭环

引用 `docs/001-webui-refactor/m2-feature-pages/tasks/T2.10-buffer.md`：

> **BUFFER: no issues encountered.**
>
> M2 执行期（T2.1–T2.7）未触发 T2.10 定义的三类场景：
> - (1) T2.1 灯塔页未暴露 M1 组件缺口——`/practice` 重构时 PageHeader / Card / CardHeader / CardBody / Button (4×5 矩阵) / EmptyList / DetailGrid / Badge 全部可直接消费，无需回改 m1-infra；
> - (2) T2.2–T2.7 无非页面级 bug——所有 page task 工具链验证全绿，仅有少量局部 DONE_WITH_CONCERNS（主要为"task spec 描述的完整布局重构被 handoff 压缩为 cleanup-only"），T2.2 已通过 H4 fix（commit `2ac8cc0`）补回 `/qa` 布局；
> - (3) 无跨页 merge conflict——每页 PR 独占 `src/features/<page>/*`，无文件冲突。

closure marker：`<!-- closure: T2.10 · status: no-issues-encountered · closed_by: main-agent · timestamp: 2026-04-16 13:20 -->`。

M2 phase **无新增独立 m1-infra patch PR**；T2.10 buffer task 以 "no issues" 收口。

### 5.2 已识别的 minor follow-up（非阻塞，deferred cleanup）

由 T2.10 buffer 登记的"执行期 SubAgent 报告的非阻塞 concerns"，归为 M2 后延续性清理，**不影响 M2 phase 验收**：

| # | 文件 | 问题 | 影响 |
|---|---|---|---|
| 1 | `src/features/qa/qa-workbench-shell.tsx` | helper 函数（`renderCitations` 等）有 `bg-white` 硬编码 | 深色模式下该元素不跟踪主题色（仍是白色背景）；不崩坏，仅视觉一致性退化 |
| 2 | `src/features/questions/question-detail-workbench.tsx` | 4 处 `bg-white` 硬编码 | 同上 |

**为什么不 block M2**：
- M2 plan `§验收标准` 第 5 条 grep-clean 清单（`interactive-card` / `reveal-list` / `radar-draw` / 旧 token 类名 × 5 / `bg-accent` / `text-accent` / `eyebrow=`）**未包含** `bg-white` 约束。
- `m1-infra/changelog.md` 偏差段亦未将 `bg-white` 列为"必清"——M1 仅砍掉靛紫 surface-nav / `body` radial gradient / 渐变 logo 卡片等装饰层；`bg-white` 硬编码本不在 M1/M2 显式清单内。
- 属 `docs/reference/design-system.md §5 反模式` 第 2 条"不要在 className / style 里写死颜色"的精神延续，但不是 M2 合并门槛。

**建议处理方式**：立独立 cleanup PR（`fix(ui): replace bg-white hardcode with surface token in qa + questions detail`），或作为后续 phase 开启时的 pre-sweep item。

### 5.3 执行节奏偏差

| 偏差维度 | plan 预期 | 实际 | 说明 |
|---|---|---|---|
| T2.2 `/qa` 一次性完成 | 单 commit | 分 2 commit（`6d54ea7` cleanup + `2ac8cc0` layout fix via H4 fix） | T2.2 首次实施被 handoff 压缩为 cleanup-only 范围，H4 fix 补回 spec 描述的 sidebar+chat flex 布局。记录供后续页面 task 作 handoff 范围校验参考 |
| T2.7 `/resume` 是否升级 design doc | plan 预期"启动前独立判定" | **未升级**，沿用轻量 design note | 启动时判定结构复杂度可由 5 项 design note 承载（三层嵌套用 PageHeader + SectionHeading 即可清晰分隔），无需独立小 design doc。`roadmap.md §5.5` R4 风险已缓解 |
| Buffer 使用 | plan 预留 0–2 天 | 0 天（no-issues） | M2 首轮执行即全绿，无需补丁 PR |
| 总时长 | plan 估 7–14 天 | 2026-04-15（T2.1 启动）→ 2026-04-16（T2.9 收口）≈ 2 天强度推进 | 密度重绘 + 类名替换为主，布局重整集中在 P1/P2/P5/P6；每页单测 grep-absent 模式使 TDD Step 1-4 可低成本落地 |

### 5.4 文档同步结论（T2.9 Step 1-3）

| Step | 目标文档 | 结论 | 依据 |
|---|---|---|---|
| Step 1 | `AGENTS.md` UI 描述同步 | **无需更新** | AGENTS.md 未含页面级布局描述（`src/features/` 在行 68 仅按 directory 名列出；UI 规范索引在行 63 指向 `docs/reference/design-system.md`）；M2 仅动 `src/features/<page>/*` 布局与类名，不触达 directory 级结构 |
| Step 2 | `docs/reference/ui-flows.md` 同步 | **无需更新** | ui-flows.md 定位为路由 / 交互契约文档（routes、data deps、page states、功能性 ASCII 布局），M2 未改路由 / API 依赖 / 状态契约；其 ASCII 布局骨架（如 `/practice` top-overview + workspace + history、`/qa` 2-region chat、`/interviews` list + detail、`/import` 2-column、`/resume` 2-section）与 M2 实现一致 |
| Step 3 | `docs/reference/design-system.md` 索引验证 | **有效** | `AGENTS.md:63` 链接 `docs/reference/design-system.md` 为 canonical UI 规范，链接路径正确；M2 未补充新规范（M1 产出的 tokens / 原子组件 API / 按钮编排 / 深色模式 / 反模式对 M2 全适用） |

---

## 附录：M2 Commits

```
fb07583 feat(ui): refactor /practice page to three-segment layout, clear M1 cosmetic debt (M2/T2.1)
6d54ea7 feat(ui): clear M1 cosmetic debt in /qa page files (M2/T2.2)
2ac8cc0 fix(ui): restructure /qa layout to sidebar+chat flex with PageHeader (M2/T2.2 items 6-7)
a6c3471 feat(ui): clear legacy token classes in /questions page files (M2/T2.3)
47ad573 feat(ui): clear 72 legacy token classnames across /review page (M2/T2.4)
e601cd1 feat(ui): clear 48 legacy token classnames in /interviews feature (M2/T2.5)
bfb0ca9 feat(ui): clear 32 legacy token classnames in /import feature (M2/T2.6)
3a80dd4 feat(ui): clear /resume M1 cosmetic debt (M2/T2.7)
```

（T2.8 回归验证未产出 commit；T2.10 buffer 以 `no-issues-encountered` closure marker 收口，未产出修复 commit。）

<!-- closure: m2-feature-pages · status: complete · closed_by: SubAgent(T2.9-implementer) · timestamp: 2026-04-16 -->
