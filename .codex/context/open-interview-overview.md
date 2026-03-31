# Open Interview Overview

- doc_type: context_l1
- layer: L1
- updated_at: 2026-03-31
- canonical_for: 项目总览、模块导航、L2 索引

## 项目定位

Open Interview 是一个 local-first 的面试工作台，围绕 `导入 -> 解析 -> 审核 -> 题库沉淀 -> grounded AI 问答 -> 简历深挖` 建模。产品形态以 workbench 为主，而不是 chat-first 应用。

## 模块边界

- `src/app`：Next.js App Router 页面和 API 路由。
- `src/features`：按业务流拆分的工作台 UI。
- `src/components`：可复用 UI 原子与工作台基础组件。
- `src/lib`：Zod schema 与共享工具。
- `src/server`：数据库、仓储、服务、检索与后续 provider 适配边界。
- `docs`：产品契约、数据模型、API、技术栈与任务文档。

## 当前主业务流

1. 导入原始资料或手工录入问题答案。
2. 为 `source_document` 创建 `parse_job`。
3. 在 review 流中对 AI 候选结果做人工确认。
4. 将结果写入 canonical 的 `question_item`、`interview_experience`、`resume_*` 等实体。
5. 基于题库、面经、简历与检索日志支撑 grounded QA。

## 路由与模块导航

- `/import`：导入与最近任务。
- `/review`、`/review/:jobId`：解析任务队列与人工审核。
- `/questions`、`/questions/:questionId`：题库列表与详情。
- `/practice`：随机练习与 10 题模拟考试。
- `/interviews`、`/interviews/:interviewId`：面经与来源上下文。
- `/qa`、`/qa/:sessionId`：带引用的 AI 问答。
- `/resume` 及其 project/session 路由：简历与项目深挖。

## L2 索引

- `open-interview-workbench-feature.md`
- `open-interview-import-feature.md`
- `open-interview-review-feature.md`
- `open-interview-questions-feature.md`
- `open-interview-practice-feature.md`
- `open-interview-interviews-feature.md`
- `open-interview-qa-feature.md`
- `open-interview-resume-feature.md`
- `open-interview-server-core-feature.md`

## 读取建议

- 改工作台壳层和导航，先读 `open-interview-workbench-feature.md`。
- 改导入、上传、解析触发，先读 `open-interview-import-feature.md`。
- 改审核确认流程，先读 `open-interview-review-feature.md`。
- 改题库、练习、面经、QA、简历，各自进入对应 feature 文档。
- 改服务、仓储、数据库或检索逻辑，先读 `open-interview-server-core-feature.md`。
