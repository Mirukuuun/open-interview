# Open Interview Practice Feature

- doc_type: context_l2
- updated_at: 2026-04-03

## Manifest

- 路由：`/practice`
- 主要目录：`src/features/practice`
- 相关服务：`src/server/services/practice-service.ts`
- 相关仓储：`src/server/repositories/assessment-repository.ts`
- 相关文档：`docs/ui-flows.md`、`docs/api-schema.md`、`docs/data-model.md`

## Data Flow

1. 页面加载时读取 active 题库生成随机练习题池，同时读取最近考试结果摘要与 singleton 长期能力画像；若存在定向维度参数，则先按维度映射过滤题池。
2. 顶部总览主卡始终展示模式切换、题池统计和长期能力画像；未开始练习时使用完整态 2x3 画像，随机练习中切为紧凑态，模拟考试作答中进一步压缩但仍保留 6 维全貌。
3. 随机练习在客户端对当前题池洗牌，逐题展示题目，待用户手动回答后再揭晓标准答案；进行中的题目区优先展示进度与当前题面，最近考试退到次级历史区。
4. 模拟考试创建 `assessment_session` 与 10 条 `assessment_item` 快照，并在 item 层同步写入 `dimension_weights_json`，保证整套考试在评分前后使用相同题面与固定维度映射；若当前为定向练习，则抽题只来自该维度过滤后的题池。
5. 用户提交 10 题答案后，service 调用评分链路生成单题分数、整体反馈与本次考试维度摘要，再按覆盖权重增量更新 `practice_profile` / `practice_profile_dimension`；考试作答态默认退化为单栏聚焦，减少次级信息干扰。
6. 结果页首屏优先展示总分、整体反馈和薄弱项，考试雷达、长期能力画像、画像更新和逐题反馈按信息层级依次展开。

## Business Rules

- 随机练习默认面向全量 active `question_item`，单轮内题目不重复；刷新页面视为新一轮。
- 模拟考试只从带 `canonical_answer` 的 active 题目中抽题；不足 10 题时不允许开考。
- `/practice` 首屏应优先展示题池规模、可评分题、训练范围与长期能力画像，不再保留固定左侧长摘要栏。
- 顶部主卡必须并入长期能力画像；未开始练习时完整展示，练习中与考试中改为紧凑版 2x3 网格。
- 考试题目、标准答案、分类与标签必须以快照写入 `assessment_item`，避免题库变更影响已提交结果。
- 评分优先使用 AI rubric；provider 不可用时必须退化到 deterministic fallback，而不是让考试直接失败。
- 固定维度 catalog 为：`java_fundamentals`、`database_storage`、`distributed_systems`、`computer_fundamentals`、`system_design_engineering`、`agent_capability`。
- 维度映射由配置驱动，当前以 `question_item.category` 和 tags 为主要信号；命中多个信号时合并归一化为 `dimension_weights_json`，无信号时回退到 `system_design_engineering`。
- `assessment_item` 必须额外快照维度权重，保证 taxonomy 或映射规则变化后，历史考试与画像更新仍可复现。
- 本次考试雷达只展示当前试卷覆盖到的固定维度；长期能力画像始终展示全量固定维度。
- 长期能力画像只更新本次考试有覆盖证据的维度，未覆盖维度保持原值；更新强度与 `coverage_weight` 成正比。
- 最近考试和长期画像都应能一键跳转到对应维度的定向练习，并允许随时退出过滤回到全量随机练习。
- 最近考试区只展示最近 3 条紧凑记录，定位为历史扫读区而不是主内容列。
- 考试提交和评分阶段需要显式 loading 反馈，不能只依赖按钮文案变化。
- 历史旧考试若缺少 `dimension_weights_json`，允许继续查看历史 summary，但不会回填进长期能力画像。
- 历史旧考试里的 `weak_areas.key` 若仍是旧 taxonomy key，应在 service 层归一到当前固定维度；无法归一时仅保留文本薄弱项摘要，不能阻断 `/practice` 页面渲染。
