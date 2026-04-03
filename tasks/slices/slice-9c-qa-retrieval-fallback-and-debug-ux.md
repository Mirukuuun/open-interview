# Slice 9C — QA Hybrid Retrieval 主链

- task_id: oi-slice-9c-qa-hybrid-retrieval-core
- owner: execution
- status: done
- priority: high
- delivery_note: 当前仓库主干已落地本 slice 对应能力；此文件保留为执行留痕，不再表示 future work。
- goal: 在 SQLite FTS 路线与 Milvus 向量检索基础层之上，落成 QA 的 hybrid retrieval 主链：filter pushdown、FTS recall、Milvus recall、structured expansion、merge/rerank

## Scope
- in: query normalize
- in: obvious metadata/filter pushdown（tag / category / company / role / source kind 等）
- in: SQLite FTS recall 与 Milvus vector recall 的并行组织
- in: shared tag / shared source / related question / supporting chunk 的 structured expansion
- in: 轻量 app-side merge / rerank
- in: retrieval summary / retrieval log 收口
- in: 为 answer chain 提供稳定的 grounded context packet

## Out of scope
- embedding 生成 / Milvus collection 基础设施（由 9B 负责）
- grounded answer chain（由 9D 负责）
- 0 citation 友好降级（由 9D 负责）
- 大规模 UI 改版（由 9A 负责）
- heavy reranker infra
- LangGraph

## Constraints
- align with `docs/qa-dialog-rag-plan.md`
- 不要把 `hybrid` 退化成“只有 FTS 的旧逻辑换壳”
- metadata filters 要尽量下推，不要全靠后置裁剪
- merge / rerank 先走轻量可解释规则，不为“显得高级”引入不可控复杂度
- retrieval log 必须能解释最终 context 是怎么来的
- Milvus recall 命中要与 SQLite-side chunk / citation 边界稳定对齐

## Done when
- [x] query normalize + metadata/filter pushdown 可用
- [x] SQLite FTS recall 与 Milvus recall 能稳定并行进入主链
- [x] structured expansion 可为 final context 提供补充证据
- [x] merge / rerank 规则落盘并在代码中可解释
- [x] retrieval packet 已能稳定提供给后续 answer chain
- [x] validation + smoke complete
- [x] reviewer-ready evidence complete

## Reviewer focus
- 是否真正形成 hybrid retrieval，而不是旧逻辑小修小补
- metadata / filter pushdown 是否真的发挥作用
- Milvus 命中与 structured expansion 的组合是否清晰可解释
- retrieval log 是否足够支持调试与后续评估

## Refs
- `docs/qa-dialog-rag-plan.md`
- `docs/tech-stack.md`
- `src/server/retrieval/hybrid-qa-retrieval.ts`
- `src/server/services/qa-session-service.ts`
- `src/lib/schemas/qa.ts`
