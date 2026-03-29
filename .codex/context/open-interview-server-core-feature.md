# Open Interview Server Core Feature

- doc_type: context_l2
- updated_at: 2026-03-29

## Manifest

- 主要目录：`src/server/api`、`src/server/db`、`src/server/repositories`、`src/server/services`、`src/server/retrieval`
- 相关脚本：`scripts/db/init.mjs`
- 相关文档：`docs/data-model.md`、`docs/api-schema.md`

## Data Flow

1. route handler 解析请求并调用 service。
2. service 通过 repository、storage 和 retrieval 协同完成用例。
3. repository 负责读取 SQLite canonical 数据、retrieval chunk 元数据和 Milvus sync state。
4. vector adapter / jobs 负责 embedding -> Milvus upsert / delete / search，不改变 SQLite 真相源角色。
5. retrieval 与 session 逻辑在 canonical 数据之上提供 rewrite、hybrid retrieval、grounded answer 与 retrieval trace。

## Business Rules

- Route handler 只处理 HTTP envelope 和错误映射。
- canonical 数据、job 状态和检索日志要保持可追溯。
- 数据模型或 API 改动前，必须同步核对并更新 canonical 文档。
- 外部向量后端必须通过 server-only adapter 暴露，不能让 route / UI 直接依赖 Milvus 细节。
- embedding provider config 与 parse / QA LLM provider config 必须独立解析，避免向量链路误用聊天模型网关。
- interview / knowledge note 解析在外部 LLM provider 失败时，应退化到本地启发式候选并显式写入 warning，而不是让导入链路直接硬失败。
- interview / knowledge note 的 LLM parse prompt 必须要求自然语言字段输出简体中文；`source_answer` 作为原始证据时可以保留原文语言。
- 线上 LLM provider 超时必须通过 service env 可配置，以便为长文档解析单独放宽等待窗口。
- parse review 确认导入和手动录题必须折叠为单一主答案落库；若同时存在 `source_answer` 与 `canonical_answer`，题库主答案优先采用来源答案。
- 题库浏览 API 不再暴露“个人答案”筛选语义，避免将 answer variant 类型差异误导成主答案差异。
