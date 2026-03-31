# Open Interview QA Feature

- doc_type: context_l2
- updated_at: 2026-03-31

## Manifest

- 路由：`/qa`、`/qa/:sessionId`
- 主要目录：`src/features/qa`
- 相关服务：`src/server/services/qa-session-service.ts`
- 相关检索：`src/server/retrieval/*`
- 相关 API：`src/app/api/qa/sessions/*`

## Data Flow

1. 用户提交问题后，session service 先基于近期会话做 history-aware rewrite。
2. QA retrieval 维护 SQLite chunk 真相表，并通过 foundation service 收口 embedding-state / Milvus sync-state；embedding provider 配置独立于常规 LLM provider。
3. Hybrid retrieval 同时执行 SQLite lexical recall、Milvus vector recall、structured expansion 和轻量 merge/rerank。
4. answer chain 始终产出 `answer`，并按 grounding 强弱区分 `answer_mode` 与 `support_summary`；当本地依据较弱或缺失时，回答会降级为“通用回答 + 明确说明 support”而不是直接拒答。
5. UI 默认以 chat bot 模式展示 session rail、transcript 与 composer；引用、related questions 和 retrieval trace 收纳在 assistant turn 的折叠区，首屏文案保持简短。
6. 完整 retrieval trace 继续持久化到 session turn / retrieval log，供调试和审阅回看。

## Business Rules

- QA 默认是聊天式问答页，而不是指标 / 调试工作台首屏。
- QA 仍然优先 grounded answer，但 `no_grounded_support` 只表示“缺少本地依据”，不表示“拒绝回答”。
- assistant turn 需要显式区分 `grounded_answered`、`weak_support` 和 `no_grounded_support`，但这些信息默认以次级元信息呈现。
- 引用、related questions 和 retrieval trace 必须可追溯，但无需默认完整暴露给用户。
- 左侧 session rail 需要支持新建、切换、删除会话。
- QA 页避免重复解释问答机制，优先把空间留给会话、回答和提问动作本身。
- 会话记录和检索日志需要能反查，便于调试与审阅。
- SQLite 继续是 retrieval metadata 真相源；Milvus 只承担向量索引和语义召回后端角色。
- embedding 配置必须走独立的 `EMBEDDING_*` / `EMBEDDING_PROVIDER_NAME` 链路，不能隐式回退到 `LLM_*`。
- QA 侧边相关题目展示分类时，默认使用与题库一致的中文 taxonomy 显示映射。
