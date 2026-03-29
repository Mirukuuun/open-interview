# Slice 9D — QA Grounded Answer / Fallback / Rewrite

- task_id: oi-slice-9d-qa-grounded-answer-fallback-rewrite
- owner: execution
- status: planned
- priority: high
- goal: 基于稳定的 hybrid retrieval packet，把 QA 回答器升级成真正的 grounded answer chain，并收口 support-level、友好降级和 follow-up rewrite

## Scope
- in: server-only LangChain grounded answer chain / runnable 层
- in: 基于 retrieval packet 组装 grounded context packet
- in: 利用最近若干轮 session history 参与回答
- in: history-aware query rewrite / standalone question reformulation
- in: `answer_mode` 语义：`grounded_answered | weak_support | no_grounded_support`
- in: 0 citation / 弱支撑场景的友好降级
- in: citations / related questions / retrieval log / session persistence 保持主链可用

## Out of scope
- embedding / Milvus collection 基础设施（由 9B 负责）
- hybrid retrieval 主链实现（由 9C 负责）
- 大规模 UI shell 改版（由 9A 负责）
- LangGraph 状态图
- agentic RAG

## Constraints
- align with `docs/qa-dialog-rag-plan.md`
- 优先保留 `openClawLlmClient` / adapter boundary，不把 provider 逻辑扩散到 routes
- 不允许用“友好降级”偷换成无依据硬答
- rewrite 需要服务于 retrieval 质量，而不是把整段 chat history 无脑塞给检索器
- citations / related questions / retrieval logs 不能回退
- answer chain 需要适配 SQLite FTS + Milvus hybrid retrieval 输出协议

## Done when
- [ ] QA 回答主链不再依赖模板式 synthesizer
- [ ] answer chain 能消费 query、session history、retrieval packet、citations、support level
- [ ] follow-up / 省略句场景可先 rewrite 再检索
- [ ] `answer_mode` 与 friendly fallback 语义可用
- [ ] 0 citation 场景下普通用户不再看到裸工程错误
- [ ] validation + smoke complete
- [ ] reviewer-ready evidence complete

## Reviewer focus
- 当前实现是否真使用了 grounded LLM answer chain，而不是换壳模板
- rewrite 是否真正帮助 retrieval，而不是增加无谓复杂度
- fallback 是否坚持 groundedness 边界
- citations / related questions / retrieval log / session persistence 是否仍完整保留

## Refs
- `docs/qa-dialog-rag-plan.md`
- `docs/tech-stack.md`
- `src/server/services/qa-session-service.ts`
- `src/server/adapters/openclaw/generate-grounded-qa.ts`
- `src/server/adapters/openclaw/llm-client.ts`
- `src/server/retrieval/hybrid-qa-retrieval.ts`
- `src/lib/schemas/qa.ts`
