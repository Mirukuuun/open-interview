# Open Interview Domain

- doc_type: context_l1
- layer: L1
- updated_at: 2026-03-26
- canonical_for: 核心实体、状态迁移、业务词汇

## 核心实体组

- `source_document`：导入后的原始真相源，覆盖文本、上传文件、简历与手工录入。
- `parse_job`：面向 source 的异步解析任务，先承接 AI 中间态。
- `interview_experience`：单篇面经或面试上下文记录。
- `question_item` / `answer_variant` / `tag`：题库 canonical 数据与答案变体。
- `resume_document` / `resume_project` / `ai_session` / `session_turn`：简历与项目深挖会话。
- `chunk` / `embedding` / `retrieval_log`：检索、RAG 和 grounded QA 的支持实体。

## 核心状态

### Source parse_status

- `not_started`
- `pending`
- `running`
- `needs_review`
- `confirmed`
- `failed`

### Parse job status

- `pending`
- `running`
- `success`
- `failed`
- `needs_review`
- `confirmed`

## 业务不变量

- `source_document` 永远是原始输入真相源。
- AI 解析结果先进入 `parse_job.result_json`，人工确认后才写 canonical 表。
- `question_item` 是长期复用和问答检索的 canonical 单元。
- grounded QA 必须以结构化实体和检索结果为依据，不直接把模型输出当事实。
- 简历与项目深挖是独立于题库的第二条知识沉淀路径，但共享 session / retrieval 思维。

## 业务流转

1. 导入或上传原始资料，生成 `source_document`。
2. 创建 `parse_job`，异步产出 `ParseResult`。
3. 人工审核并确认，写入题库、面经或简历相关实体。
4. 基于 canonical 实体与 `chunk` / `embedding` 进行搜索和 grounded QA。

## 领域术语

- Review Queue：待人工确认的解析任务集合。
- Question Bank：确认后的题库主视图。
- Interview Notes：按 source 聚合的面经上下文浏览面。
- Resume Deep Dive：围绕简历项目展开的追问与回答会话。
