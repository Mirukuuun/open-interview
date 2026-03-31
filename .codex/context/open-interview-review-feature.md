# Open Interview Review Feature

- doc_type: context_l2
- updated_at: 2026-03-31

## Manifest

- 路由：`/review`、`/review/:jobId`
- 主要目录：`src/features/review`
- 相关服务：`src/server/services/parse-review-service.ts`
- 相关实体：`parse_job`、`question_item`、`interview_experience`

## Data Flow

1. 队列页读取待处理 parse jobs，并按状态筛选。
2. 详情页加载 `parse_job.result_json`，展示来源上下文、候选问题和导入预览三块并列工作区。
3. 用户确认后，由 review service 将结果写入 canonical 实体并回写 job/source 状态。

## Business Rules

- review 是 human-in-the-loop 主流程，不是次级弹窗。
- `needs_review` 项必须一跳可达。
- 详情页三块主工作区在桌面端保持同高，候选题面板支持独立滚动。
- 失败任务需要可见，并保留重试或回看 source 的路径。
