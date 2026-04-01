# Open Interview Review Feature

- doc_type: context_l2
- updated_at: 2026-04-01

## Manifest

- 路由：`/review`、`/review/:jobId`
- 主要目录：`src/features/review`
- 相关服务：`src/server/services/parse-review-service.ts`
- 相关实体：`parse_job`、`interview_experience`、`interview_question`、`question_item`

## Data Flow

1. 队列页读取待处理 parse jobs，并按状态筛选。
2. 详情页加载 `parse_job.result_json`，展示来源上下文、候选问题和导入预览三块并列工作区。
3. 对于尚未确认入库的任务，用户可以重试解析；确认导入时，review service 会按 source kind 分流写入，并回写 job/source 状态。

## Business Rules

- review 是 human-in-the-loop 主流程，不是次级弹窗。
- `needs_review` 项必须一跳可达。
- 详情页三块主工作区在桌面端保持同高，候选题面板支持独立滚动。
- 尚未确认入库的审核项必须保留重试入口；`failed` 和 `needs_review` 项都应支持重新解析或回看 source。
- `interview_experience` 类型的确认导入只写 `interview_experience` 和 `interview_question`，候选题操作只允许 `keep / skip`。
- `knowledge_note` 类型的确认导入仍可通过 `create / merge / skip` 直接写入 `question_item`。
