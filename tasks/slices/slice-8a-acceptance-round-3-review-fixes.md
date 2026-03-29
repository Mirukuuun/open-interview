# Slice 8A — Acceptance Round 3 Review Fixes

## Metadata
- task_id: oi-slice-8a-acceptance-round-3-review-fixes
- owner: execution
- status: completed
- created_at: 2026-03-26T11:07:00+08:00
- updated_at: 2026-03-26T11:51:00+08:00
- execution_transport: codex-runner

## Goal
修复第三轮验收里最直接影响 review / confirm 体验的 3 个问题：候选题自动补分类/标签、`q_xxx` 误导性认知、确认入库改成先弹窗后刷新。

## Scope
- in: `extract_interview` 的 prompt / adapter，必要时补充 canonical category / tag vocabulary 注入
- in: review 页的 `q_xxx` 展示/输入提示去歧义
- in: review 页确认入库前二次确认、成功后刷新
- out: question 主键体系重做
- out: 大规模视觉改版
- out: resume / 其他工作台联动改造

## Acceptance issues
- P0-1: 上传解析候选题没有自动补 category / tags；需要把现有 canonical category / tags 口径显式带给模型，并尽量自动填好。
- P0-2: `q_xxx` 让人误以为是临时未入库 ID；要么改展示/提示去歧义，要么在 merge 交互里用更清楚的文案，不改主键体系。
- P0-3: 点击“确认入库”应先弹确认框/弹窗；确认成功后刷新页面，而不是只停留在顶部提示横幅。

## Constraints
- 保持现有 `upload -> parse -> review -> confirm -> canonical` 主链和安全门不变。
- “自动补 category / tags” 不能偷换成纯前端默认值；至少要把 canonical vocabulary 显式纳入 parse prompt。
- 不要顺手扩到 taxonomy 大改、provider 切换、question ID 制度重构。
- 交付里要明确说明：`q_xxx` 是正式 canonical ID 前缀，不是“未入库临时 ID”。

## Done when
- [x] 解析链路会把 canonical category / tag vocabulary 带入 interview parse prompt
- [x] review 页面中候选题默认带出更可信的 category / tags
- [x] `q_xxx` 相关展示/提示不再误导
- [x] 确认入库前有弹窗，成功后刷新页面
- [x] validation complete
- [x] smoke complete
- [x] reviewer verdict recorded
- [x] task/doc/status synced

## Closeout
- 2026-03-26T11:51:00+08:00：reviewer 验收 PASS。确认本 slice 只修改了 `parse-review-service.ts`、`parse-source.ts`、`review-job-workbench.tsx` 三处主线文件，3 个目标点均满足，且未破坏 `upload -> parse -> review -> confirm -> canonical` gate。

## Reviewer focus
- category / tags 是否真来自解析链路自动填充，而不是仅前端补默认值
- `q_xxx` 是否被清晰解释为正式 ID / merge 目标提示是否消歧
- confirm 是否真为先确认再提交、成功后刷新
