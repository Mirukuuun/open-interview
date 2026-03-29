# Open Interview Interviews Feature

- doc_type: context_l2
- updated_at: 2026-03-26

## Manifest

- 路由：`/interviews`、`/interviews/:interviewId`
- 主要目录：`src/features/interviews`
- 相关服务：`src/server/services/interview-browse-service.ts`
- 相关实体：`interview_experience`、`source_document`

## Data Flow

1. 列表页按公司、岗位、轮次或关键词浏览面经来源。
2. 详情页聚合 source 元数据、摘要、关联问题和上下文片段。
3. 浏览结果同时服务于 review 复核和后续 QA 检索引用。

## Business Rules

- `interview_experience` 是 source/context 记录，不是题库真相源本身。
- 页面需要保留来源上下文，避免只展示脱离来源的问题列表。
- 过滤和排序优先利用结构化字段与来源关联。
- 面经列表和详情里的标签、关联题目分类在 UI 层统一做中文显示映射，不改动底层 tag/category key。
