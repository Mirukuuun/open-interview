# Open Interview Server Core Feature

- doc_type: context_l2
- updated_at: 2026-04-03

## Manifest

- 主要目录：`src/server/api`、`src/server/db`、`src/server/repositories`、`src/server/services`、`src/server/retrieval`、`src/server/prompts`、`src/prompts`
- 相关脚本：`scripts/db/init.mjs`、`scripts/db/backup.mjs`、`scripts/db/export-question-bank.mjs`
- 相关文档：`docs/data-model.md`、`docs/api-schema.md`、`docs/data-safety-baseline.md`

## Data Flow

1. route handler 解析请求并调用 service。
2. service 通过 repository、storage、retrieval 以及 `src/server/prompts` 对 `src/prompts/*.md` 的读取与拼装协同完成用例。
3. repository 负责读取 SQLite canonical 数据、retrieval chunk 元数据和 Milvus sync state。
4. vector adapter / jobs 负责 embedding -> Milvus upsert / delete / search，不改变 SQLite 真相源角色。
5. retrieval 与 session 逻辑在 canonical 数据之上提供 rewrite、hybrid retrieval、grounded answer 与 retrieval trace。
6. health summary 统一由 server-only health 模块聚合，对外暴露 vector backend 与 LLM provider 的运行态，不让 UI 直接探测 provider。

## Business Rules

- Route handler 只处理 HTTP envelope 和错误映射。
- canonical 数据、job 状态和检索日志要保持可追溯。
- 数据模型或 API 改动前，必须同步核对并更新 canonical 文档。
- 外部向量后端必须通过 server-only adapter 暴露，不能让 route / UI 直接依赖 Milvus 细节。
- embedding provider config 与 parse / QA LLM provider config 必须独立解析，避免向量链路误用聊天模型网关。
- 面向 workbench top bar 或 `/api/health` 的模型状态提示，必须来自 server-only 的真实探测结果，而不是静态文案或客户端直连 provider。
- parse / QA / practice grading 的固定 LLM prompt 正文统一维护在 `src/prompts/*.md`，`src/server/prompts` 负责读取 markdown、拼装运行时上下文并向业务文件暴露调用接口。
- interview / knowledge note 解析在外部 LLM provider 失败时，应退化到本地启发式候选并显式写入 warning，而不是让导入链路直接硬失败。
- interview / knowledge note 的 LLM parse prompt 必须将候选答案统一为单一 `answer` 字段；原文已有正确答案时优先直接沿用原文，只有原文缺失或明显错误时才由模型补全，直接沿用原文时可以保留原始语言。
- 线上 LLM provider 超时必须通过 service env 可配置，以便为长文档解析单独放宽等待窗口。
- parse review 确认导入和手动录题必须折叠为单一主答案落库；review 候选编辑以单一答案为主，兼容旧 payload 时仍优先采用来源答案。
- 题库浏览 API 不再暴露“个人答案”筛选语义，避免将 answer variant 类型差异误导成主答案差异。
- 数据安全基线必须至少覆盖 SQLite 一致性备份、恢复说明和 canonical question bank JSON 导出。
- `extract_interview` 的确认导入必须按 source kind 分流：`interview_experience` 写 `interview_question`，`knowledge_note` 才直接写 `question_item`。
- 面经题与题库题之间的正式关系只通过 `interview_question_link` 和手动沉淀动作建立，不允许在面经确认阶段隐式创建。
