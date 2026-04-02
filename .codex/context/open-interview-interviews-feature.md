# Open Interview Interviews Feature

- doc_type: context_l2
- updated_at: 2026-04-02

## Manifest

- 路由：`/interviews`、`/interviews/:interviewId`
- 主要目录：`src/features/interviews`
- 相关服务：`src/server/services/interview-browse-service.ts`
- 相关实体：`interview_experience`、`interview_question`、`interview_question_link`、`source_document`

## Data Flow

1. 列表页按公司、岗位、轮次或关键词浏览面经来源。
2. 详情页聚合 source 元数据、摘要、面经原题、上下文片段以及每道面经题的题库推荐与正式沉淀结果。
3. 浏览结果同时服务于 review 复核、题库来源回看和后续手动沉淀操作。

## Business Rules

- `interview_experience` 是 source/context 记录，不是题库真相源本身。
- 页面需要保留来源上下文，避免只展示脱离来源的问题列表。
- 过滤和排序优先利用结构化字段与来源关联。
- 面经列表和详情里的标签、关联题目分类在 UI 层统一做中文显示映射，不改动底层 tag/category key。
- 新导入的面经题默认只落 `interview_question`，不会自动生成 `question_item`。
- 面经详情页展示的相关题库题属于检索建议；只有显式执行“沉淀到题库”后，才会写入正式关联。
- 面经详情页的推荐展示优先取 top3 中分数 `>= 90` 的题；若 top3 内没有高置信命中，则回退展示 top2，避免把弱相关的第 2/3 条也强行展示出来。
- 面经详情页每道题仍保留来源答案与原文 QA，但原文 QA 默认折叠，只有在用户主动展开时才显示。
- 历史上已经直接写入题库的面经详情仍需兼容读取，避免旧数据在新页面中丢失。
