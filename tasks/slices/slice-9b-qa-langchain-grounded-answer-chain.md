# Slice 9B — QA Milvus 向量检索基础层

- task_id: oi-slice-9b-qa-milvus-vector-foundation
- owner: execution
- status: done
- priority: high
- delivery_note: 当前仓库主干已落地本 slice 对应能力；此文件保留为执行留痕，不再表示 future work。
- goal: 为 QA 建立 Milvus-first 的向量检索基础层，同时保留 SQLite 作为业务真相源与 retrieval metadata 主存

## Scope
- in: 明确 retrieval chunk 的来源与边界（question / answer / source excerpt 等）
- in: 设计 SQLite-side chunk / embedding-state / sync-state 边界
- in: 设计 Milvus collection schema / index strategy / metadata 副本边界
- in: chunk -> embedding -> Milvus upsert 主链
- in: 历史数据 backfill / resync / rebuild 机制
- in: Node 侧向量 backend adapter / health probe / local-dev 启动约定
- in: 保持 chunk id 稳定，供后续 hybrid retrieval / citations / retrieval log 复用

## Out of scope
- FTS + vector merge/rerank 规则（由 9C 负责）
- grounded answer chain（由 9D 负责）
- 0 citation / fallback 产品语义（由 9D 负责）
- 大规模 UI 改版（由 9A 负责）
- 分布式 Milvus 集群治理
- LangGraph

## Constraints
- align with `docs/qa-dialog-rag-plan.md`
- align with `docs/tech-stack.md`
- SQLite 继续作为业务真相源，Milvus 只做向量检索层
- 不允许把 question / answer / session 主数据迁入 Milvus
- P0 先以 Milvus standalone 为边界，不做 cluster-first 设计
- chunk id / entity id 要稳定，不能为检索便利破坏引用与数据可追踪性
- 必须有清晰的 backfill / delete / re-embed / rebuild 策略

## Done when
- [x] retrieval chunk 来源与 schema 已定版
- [x] SQLite-side sync state / embedding state 已定版
- [x] Milvus collection / index / metadata 设计已落盘
- [x] chunk -> embedding -> Milvus upsert 主链可实现
- [x] 历史数据 backfill / resync 方案明确
- [x] 当前宿主机的 local-dev / Docker / health 风险有结论
- [x] reviewer-ready evidence complete

## Reviewer focus
- 是否真的形成了可落地的 Milvus-first 向量检索底座，而不是停留在概念层
- SQLite 与 Milvus 的职责边界是否清晰
- sync / backfill / rebuild 方案是否足够可控
- 是否避免把系统过早推向分布式检索复杂度

## Refs
- `docs/qa-dialog-rag-plan.md`
- `docs/tech-stack.md`
- `docs/data-model.md`
- `src/server/db/schema/retrieval.ts`
- `src/server/retrieval/hybrid-qa-retrieval.ts`
- `src/server/services/qa-session-service.ts`
- `src/lib/schemas/qa.ts`
