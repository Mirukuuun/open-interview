# m2-feature-pages · changelog

关闭日期：2026-04-16

## 交付物

- **7 个 feature 页面重构**（独立 commit，P1→P7 顺序落盘在 `feature/001-webui-refactor` 分支）：
  - P1 `/practice`（commit `fb07583`）：三段布局 = 顶部 OverviewCard + 主舞台 Card + 右侧最近考试 Card；雷达图保留静态版本（去 `radar-draw` animation，SVG 主体保留）。
  - P2 `/qa`（commits `6d54ea7` + `2ac8cc0`）：左侧会话抽屉 + 右侧单列气泡聊天主区；引用 snippet inline 折叠。T2.2 分两 commit：cleanup + layout fix 补回 sidebar+chat flex + PageHeader。
  - P3 `/questions`（commit `a6c3471`）：保留 Header + filter + list 骨架，按新密度（Header 紧凑 `px-4 py-3` / Body 平衡）重绘。
  - P4 `/review`（commit `47ad573`）：保留队列 / 详情骨架按新密度重绘；`review-confirm-dialog` 消费 M1 `Dialog`。
  - P5 `/interviews`（commit `e601cd1`）：左侧来源列表（280px）+ 右侧详情区的主从分栏布局。
  - P6 `/import`（commit `bfb0ca9`）：表单主导 + step 2 分步感 + action panel 收敛。
  - P7 `/resume`（commit `3a80dd4`）：三层导航（简历 → 项目 → 深挖会话），深挖会话复用 T2.2 单列气泡风格。
- **`design.md §12` 未决事项闭环 4 条**：雷达图（保留静态）/ qa 气泡（单列 + inline 折叠引用）/ 空态插图（不引入，保持 `EmptyList` 克制）/ 主题切换器 label（M1 时已 icon-only 闭环，M2 显式无变更确认）。
- **测试套件新增**：7 份 `tests/<page>-page.test.tsx`（每页一份废弃类名 grep-absent 冒烟测试，构成 T2.1–T2.7 的 TDD Step 1-4 载体）；T2.8 无新增测试文件（纯验证性质）。
- **Phase 完成报告**：`docs/001-webui-refactor/m2-feature-pages/report.md`（§1 实际交付物 / §2 规格符合度 11 条 checkbox / §3 关键决策 / §4 未决闭环 / §5 偏差与经验 / 附录 commit 清单）。

## 主要变更

- **页面节奏差异化落地**：6 类布局骨架（三段总览 / 对话分栏 / 列表浏览 / 主从分栏 / 表单引导 / 渐进展开），摆脱"一律 PageHeader + DetailGrid + 两列卡片"的雷同节奏。差异仅限布局骨架；tokens / 按钮 / 卡片 / 字号 / 间距统一沿用 M1，对应 `roadmap.md §5.5` R-M2-03 风险缓解。
- **M1 已知 cosmetic 退化一次性清除**：
  - 废弃装饰类 17 处：`interactive-card` 10（qa 5 + resume 5）+ `reveal-list` 5（practice 1 + qa 3 + import 1）+ `radar-draw` 1（practice）+ 内联 `radial-gradient` 1（qa）。全部来自 `m1-infra/report.md §4` 登记的"已知 cosmetic 退化"。
  - 废弃 props：`eyebrow=` 1 处（qa-workbench.tsx:57，对应 `m1-infra/report.md §3.4` 的 PageHeader `@deprecated no-op` props）。
- **旧 token 类名统一替换**：7 页合计 **430 处 / 37 文件**（P1 63 + P2 92 + P3 42 + P4 72 + P5 48 + P6 32 + P7 81），替换为 `--color-*` 语义变量（`border-[color:var(--color-border)]` / `text-[color:var(--color-muted-foreground)]` / `text-[color:var(--color-foreground)]` / `bg-[color:var(--color-brand-soft)]` / `text-[color:var(--color-brand)]`）。对应 `m1-infra/report.md §4(d)` 登记的 430 处全量闭环。
- **M1 组件持续消费验证**：每页 task 显式消费 `Button` / `Card` / `Badge` / `PageHeader` / `EmptyList` / `DetailGrid`；`/review` 的 `review-confirm-dialog` 消费 M1 `Dialog`；`/qa` H4 fix 补回 `PageHeader` 外壳。grep 确认 `src/features/**` 无 inline `<button>` 或样式 hack 回流。
- **文档同步结论**（T2.9 Step 1-3）：`AGENTS.md` 无页面级 UI 描述、无需更新（行 63 `design-system.md` 索引依然有效）；`docs/reference/ui-flows.md` 为路由 / 交互契约文档，M2 未改路由 / API / 状态契约，ASCII 布局骨架与 M2 实现一致、无需同步；`docs/reference/design-system.md` 作为 canonical UI 规范对 M2 全适用，M2 未补充新规范。

## 偏差 / 经验

- **T2.10 Buffer `no-issues-encountered` 闭环**：M2 执行期未触发 T2.10 定义的三类场景：(1) T2.1 灯塔页未暴露 M1 组件缺口（PageHeader / Card / Button / EmptyList / DetailGrid / Badge 全部可直接消费，无需回改 m1-infra）；(2) T2.2–T2.7 无非页面级 bug（仅 T2.2 因 handoff 范围压缩走 H4 fix 补回 sidebar+chat flex 布局，属页面级范围内修复）；(3) 无跨页 merge conflict（每页 PR 独占 `src/features/<page>/*`）。M2 phase **无新增独立 m1-infra patch PR**。closure marker：`<!-- closure: T2.10 · status: no-issues-encountered · closed_by: main-agent · timestamp: 2026-04-16 13:20 -->`。
- **T2.2 `/qa` 分两 commit**：plan 预期单 commit 完成；实际 T2.2 首次实施被 handoff 压缩为 cleanup-only 范围（`6d54ea7`），H4 fix 补回 spec 描述的 sidebar+chat flex 布局（`2ac8cc0`）。记录供后续 task 作 handoff 范围校验参考。
- **T2.7 `/resume` 未升级 design doc**：`roadmap.md §5.5` R4 风险预留了"P7 启动前独立判定是否升级为独立小 design doc"；启动时判定结构复杂度可由 5 项轻量 design note 承载（三层嵌套用 PageHeader + SectionHeading 即可清晰分隔），沿用轻量 note、不阻塞合入。R4 风险已缓解。
- **非阻塞 follow-up（deferred cleanup，不影响 M2 验收）**：T2.10 buffer 登记 SubAgent concerns 中 2 处 `bg-white` 硬编码：(1) `src/features/qa/qa-workbench-shell.tsx` helper（`renderCitations` 等）；(2) `src/features/questions/question-detail-workbench.tsx` 4 处。两者均不在 M2 `§验收标准` 第 5 条 grep-clean 清单（`interactive-card` / `reveal-list` / `radar-draw` / 旧 token 类名 × 5 / `bg-accent` / `text-accent` / `eyebrow=`）内，不在 M1/M2 显式清单；属 `design-system.md §5 反模式`第 2 条精神延续，不是 M2 合并门槛。建议后续立独立 cleanup PR（`fix(ui): replace bg-white hardcode with surface token in qa + questions detail`）。
- **执行节奏偏差**：plan 估 7–14 天；实际 2026-04-15 T2.1 启动 → 2026-04-16 T2.9 收口 ≈ 2 天强度推进。密度重绘 + 类名替换为主，布局重整集中在 P1/P2/P5/P6；每页 grep-absent 单测模式使 TDD Step 1-4 可低成本落地。
- **11 条 Phase 2 验收 checkbox 状态**：源码级工具链 + grep-clean + 决策闭环 + 文档同步结论共 9 条可由 SubAgent 直接判 PASS；2 条浏览器视觉手动项（#1 动作/路由对等的视觉 diff、#2 节奏差异观感）留 `[ ]` 并以 HTML 注释标注"见 m2-feature-pages/report.md §1.3 / §2 待用户手动验收"；此模式对齐 M1 处理方式。

## Phase 范围说明

- 本 phase 为 L2 第二（末）phase，workstream `001-webui-refactor` 两 phase（`m1-infra` + `m2-feature-pages`）均已完成
- **本关闭流程仅关闭 M2 phase，不关闭整个 feature 需求**：`docs/dev-info/INDEX.md` status 仍 `active`，由后续独立 closing-feature 步骤（H13）决定
- **`roadmap.md §0 整体收口` 3 条 checkbox 未勾**：那部分由 closing-feature 根据整需求证据统一处理，不属本 phase 仪式
- 本 changelog 仅作 phase 级交付凭证；feature-level changelog 留待整体收口时追加

<!-- closure: m2-feature-pages · status: complete · closed_by: SubAgent(closing-phase) · timestamp: 2026-04-16 -->
