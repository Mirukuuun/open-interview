# Open Interview Questions Feature

- doc_type: context_l2
- updated_at: 2026-03-31

## Manifest

- 路由：`/questions`、`/questions/:questionId`
- 主要目录：`src/features/questions`
- 相关服务：`src/server/services/question-bank-service.ts`
- 相关仓储：`src/server/repositories/question-*.ts`

## Data Flow

1. 题库列表页按分类、标签、关键词和排序浏览 canonical 问题。
2. 详情页读取问题主体、主答案、补充视角、来源关联和标签信息，并根据当前浏览上下文提供上一条 / 下一条跳转。
3. 随机练习、模拟考试、grounded QA 和人工复习都以 `question_item` 为主入口消费该层数据。

## Business Rules

- `question_item` 是题库长期真相源。
- `canonical_answer` 是题库当前主答案；确认导入和手动录题时，优先采用上传来源中的答案文本落库。
- 随机练习可覆盖所有 active 题目；模拟考试只消费带 `canonical_answer` 的 active 题目。
- 题库浏览和详情不再区分“个人答案”；如存在补充答案视角，只作为附加信息展示。
- 浏览与筛选优先基于规范化字段和可解释数据，而不是模型黑盒排序。
- 详情页相邻跳转默认继承列表页的筛选、排序和分页语境；缺省时回退到题库默认排序。
- 题库 UI 对 canonical `category` / `tag` key 做中文显示映射，但筛选参数和底层存储仍保留原始 key。
