# Open Interview Resume Feature

- doc_type: context_l2
- updated_at: 2026-04-02

## Manifest

- 路由：`/resume`、`/resume/:resumeId`、`/resume/projects/:projectId`、`/resume/projects/:projectId/session/:sessionId`
- 主要目录：`src/features/resume`
- 相关服务：`src/server/services/resume-service.ts`、`src/server/services/resume-deep-dive-service.ts`
- 相关实体：`resume_document`、`resume_project`、`ai_session`

## Data Flow

1. 简历来源导入并解析成 `resume_document` 与 `resume_project`，landing 直接展示当前来源、可继续深挖项目与亮点摘要。
2. 项目详情页展示摘要、亮点、技术栈与后续追问入口。
3. deep dive session 围绕单个项目进行连续问答，沉淀结构化回答或会话轨迹，并把最新 coach hints 作为显式辅助信息展示。

## Business Rules

- 简历与项目深挖是独立业务流，但沿用 grounded、可回看、可追踪的设计。
- 项目视图优先承载面试追问准备，而不是通用文档浏览。
- 会话必须绑定 project 上下文，避免脱离简历语境。
- `/resume` 不应再退化为 placeholder landing，而要优先暴露真实项目与继续训练入口。
- deep dive 会话里的 related questions 分类展示与题库保持一致，使用统一的中文 taxonomy 显示映射。
