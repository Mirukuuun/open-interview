# Open Interview · QA 2.0 对话式 Hybrid RAG 工作台技术方案

- doc_type: tech_design
- audience: agents / implementers
- status: draft
- updated_at: 2026-03-27
- parent_doc: `docs/technical-design.md`
- canonical_for: QA 2.0 产品形态、Milvus-first 向量检索路线、hybrid retrieval 主链、grounded answer 与任务拆分

> 本文档是技术设计子文档，负责 QA / RAG 专项设计；全局架构总览、最新框架图与 roadmap 见 `docs/technical-design.md`。

## 1. 背景与本次收口

当前 Open Interview 已经具备 QA 基础能力：
- `/qa` 可创建会话并提问
- `/qa/:sessionId` 可查看历史轮次、引用与 retrieval trace
- 后端已有本地题库检索、citation 持久化、related questions、session 持久化

但它当前仍更像 **grounded retrieval demo**，而不是用户预期中的 **对话式复习助手**。

Miruku 已明确新的方向收口：
- QA 主链要按更常见的业界 RAG 形态组织
- 不再只停留在 SQLite FTS + structured merge
- 不再以 SQLite 内嵌轻量向量层为 canonical
- 正式引入 **Milvus 作为首选向量数据库**
- 同时继续保持 **SQLite 业务真相源 + workbench-first + inspectable**

因此，QA 2.0 的 canonical 路线更新为：

**SQLite as source of truth + Milvus-first vector retrieval + hybrid retrieval + grounded answer**

这意味着：
- Open Interview 仍不是重型分布式搜索平台
- 但向量检索不再只是“可选增强”或“本地试验件”
- Milvus 进入正式主链，负责 QA 的语义召回层
- SQLite 继续承载业务实体、FTS、session、retrieval log 和主数据一致性

---

## 2. 总体目标

QA 2.0 的正确定位是：

**基于本地知识库与专业向量检索后端的对话式 Hybrid RAG 复习助手**

它的核心体验应当是：
1. 用户像聊天一样自然提问
2. 系统自动完成 normalize / filter / retrieval / grounding / answer
3. 回答先可读，再可查证
4. citations / retrieval summary / debug trace 仍可见，但不压过主体验
5. 没有足够依据时，系统明确降级，不编造

---

## 3. 核心架构决策

## 3.1 数据与基础设施

### 冻结决策
- **SQLite 继续作为主数据库与真相源**
- **SQLite FTS5 继续保留**，用于 lexical / keyword recall 与结构化过滤协同
- **Milvus 作为 P0 canonical 向量数据库**
- P0 先采用 **Milvus standalone / self-hosted**，不一上来做分布式集群化
- 不引入第三方托管向量 SaaS 作为 MVP 依赖

### 为什么这样选
- 用户已明确接受更高复杂度，偏好专业向量数据库路线
- 现有 QA 已有 grounded QA 主体，下一步需要更标准的语义召回主链
- 未来若 chunk 数、召回实验、ANN 能力、评估迭代需求上升，Milvus 更符合演进方向
- 同时保留 SQLite 作为业务主库，可以避免把主数据模型整体迁入检索系统

### 当前边界
- **SQLite 管业务与事实**：question / answer / source / session / retrieval_log
- **Milvus 管向量索引与语义召回**
- **应用层负责 hybrid composition**：filters、FTS、Milvus recall、structured expansion、merge/rerank

### 风险与兜底
当前宿主机能支撑 **PoC / 小规模单机 Milvus**，但资源并不宽裕。
因此 P0 必须：
- 以 standalone 为边界
- 明确 health / startup / sync / recovery 路径
- 保留低资源开发模式下的接口级 fallback

注意：fallback 只用于开发 / 降级，不再作为 canonical 主设计。

## 3.2 对话链与编排框架

### 结论
- **P0 先接 LangChain，不先接 LangGraph**
- LangChain 负责 grounded answer chain、history-aware query rewrite、prompt / output / context assembly
- provider 逻辑继续收口在 server-only adapter boundary

### 不做什么
- 不上 agentic RAG
- 不做 planner / executor / reviewer 式产品内编排
- 不把 Open Interview 做成通用聊天 App

---

## 4. QA 2.0 的标准主链

## 4.1 Retrieval + Generation 主链

```text
user query
  -> normalize query
  -> detect metadata filters
  -> if follow-up / short ambiguous query: rewrite to standalone query
  -> hybrid recall:
       - SQLite FTS recall
       - Milvus vector similarity recall
  -> structured expansion:
       - shared tag
       - shared source
       - related question
       - neighboring/supporting chunks
  -> app-side merge / lightweight rerank
  -> classify support level
  -> grounded prompt assembly
  -> LLM answer with citations
  -> persist answer_mode + citations + retrieval log
  -> render workbench response
```

## 4.2 每一步的职责

### 1) normalize query
- trim / normalize casing
- 轻量清洗检索噪声
- 识别明显实体词或结构化条件

### 2) detect metadata filters
优先识别并下推这些条件：
- category
- tag
- source kind
- company
- role
- question family / interview track

### 3) history-aware rewrite
当用户是 follow-up、代词提问或短句追问时：
- 不直接拿原句去检索
- 先改写成 standalone query
- 避免把整段历史原样塞给 retriever

### 4) hybrid recall
至少两路并行：
- **lexical recall**：SQLite FTS / structured filter
- **vector recall**：Milvus embedding similarity search

### 5) structured expansion
对 seed hits 再做结构化扩展：
- 同 question 的 canonical answer / answer variants
- 同 source 的 supporting excerpt
- 相同 tags 的相关问题
- 可解释的 related questions 扩展

### 6) merge / lightweight rerank
P0 不要求重型 reranker。
优先使用轻量规则合并：
- dual-hit（FTS + vector 同命中）加分
- exact tag / category / company 命中加分
- source overlap / question overlap 加分
- canonical answer / supporting source 命中加分
- 噪声 chunk / 过短 chunk 降权

### 7) support-level classification
P0 至少区分：
- `grounded_answered`
- `weak_support`
- `no_grounded_support`

### 8) grounded answer generation
- 用 LangChain 组织 answer chain
- 输入包含 query、recent history、retrieval packet、citations、related questions、support level
- 输出是自然回答，但 groundedness 不能退化

---

## 5. 数据层与检索层设计

## 5.1 真相源原则
结构化实体仍是真相源：
- question
- answer variant
- source document / excerpt
- interview / resume / related metadata

retrieval 是增强层，而不是取代结构化实体的主存储模型。

## 5.2 推荐检索对象
检索 chunk 可来自：
- question text
- canonical answer
- answer variant
- source excerpt
- supporting notes / extracted interview evidence

## 5.3 向量存储与索引建议
P0 推荐能力边界：
- 为每个 retrieval chunk 生成 embedding
- 将 chunk 与 embedding 建立稳定映射
- 以 **SQLite + Milvus** 的双层方式管理检索数据

建议分工：
1. **SQLite 保存：**
   - retrieval chunk 元数据
   - chunk 与业务实体映射
   - embedding 生成状态
   - 回填 / 同步任务状态
2. **Milvus 保存：**
   - chunk embedding 向量
   - chunk_id 主键映射
   - 参与检索的必要 metadata 副本

P0 落地表边界：
- `chunks`
- `chunk_embeddings`
- `chunk_vector_sync_states`
- `vector_sync_jobs`

### 设计原则
- chunk_id 必须稳定，不能为了接入 Milvus 打乱 citation / retrieval log 边界
- Milvus 中的 metadata 只保留检索所需子集，不把它当业务主库
- upsert / delete / re-embed 必须有明确同步策略
- `/api/health` 需要能暴露 Milvus foundation 的 enabled / pending / degraded 状态，便于本地排障

## 5.4 检索日志
retrieval log 必须继续保留，至少能看见：
- normalized query / rewritten query
- metadata filters
- FTS hits
- Milvus vector hits
- merge / rerank 结果
- final selected chunks
- warnings / support-level summary

---

## 6. 产品形态与 UI 原则

## 6.1 QA 2.0 的正确产品形态
仍然是：

**workbench-first，不是 chat-first 壳**

### 主界面原则
```text
┌───────────────┬───────────────────────────────┬──────────────────────┐
│ 左侧会话栏     │ 中间聊天区                     │ 右侧依据/调试区        │
│ 新建会话       │ transcript + input             │ citations            │
│ recent sessions│ assistant / user messages      │ related questions    │
│ status         │ retry / continue               │ retrieval summary    │
└───────────────┴───────────────────────────────┴──────────────────────┘
```

### 用户视角规则
- 默认只暴露“提问”和“回答”
- citations 可见，但不抢主阅读节奏
- retrieval trace / strategy / top_k 默认折叠到 advanced / debug 区
- 不要求用户先理解检索策略，再去正常提问

---

## 7. API / Schema 收口

## 7.1 保留现有 canonical API
继续保留：
- `POST /api/qa/sessions`
- `POST /api/qa/sessions/:sessionId/ask`
- `GET /api/qa/sessions/:sessionId`

P0 以 additive change 为主，不做破坏性重写。

## 7.2 建议新增响应字段
- `answer_mode`: `grounded_answered | weak_support | no_grounded_support`
- `support_summary`
- `retrieval_summary`（可选，给 UI / debug panel）
- `rewrite_applied`（可选）

## 7.3 兼容原则
- 旧 session / 旧 assistant turns 仍可正常渲染
- 旧数据没有 `answer_mode` 时，按兼容默认值显示
- route handlers 继续保持薄封装

---

## 8. P0 / P1 范围

## 8.1 P0（本轮应正式推进）
- Milvus standalone 向量检索能力接入
- collection / index / metadata schema 设计
- embedding 持久化 / backfill / sync 机制
- SQLite FTS + Milvus vector hybrid retrieval
- metadata/filter pushdown
- lightweight merge / rerank
- grounded answer chain
- `answer_mode` 与友好降级
- retrieval trace 继续保留

## 8.2 P1（本轮可延后）
- 更复杂的 multi-query retrieval
- 更强的 reranker
- 更丰富的 answer-mode UI
- streaming answer
- 更细的 chunking / overlap / parent-child 检索实验
- 需要时再评估 LangGraph

## 8.3 暂不纳入本轮
- 分布式 Milvus 集群化治理
- 第三方托管向量 SaaS
- agentic RAG
- 产品内多 agent orchestration
- 通用聊天 persona 化壳层

---

## 9. 风险与 tradeoff

## 9.1 Milvus 集成与运维风险
可能遇到：
- Docker / service 常驻资源开销
- 当前宿主机内存较紧，长期开启的稳定性边界有限
- Node 应用、SQLite 主库、Milvus 之间的同步复杂度上升
- 本地开发、测试、部署链路变长

### 应对
- P0 只做 standalone，不做 cluster
- 把 Milvus 接入收口在清晰的 adapter / repository boundary
- 先定义 backfill / resync / rebuild 方案
- 保留低资源开发 fallback，避免所有开发环境都被 Milvus 阻塞

## 9.2 检索质量风险
即使接了 Milvus，若：
- chunking 粗糙
- metadata 利用不足
- merge / rerank 太弱
仍会出现召回不稳。

### 应对
- 先保留 inspectable retrieval log
- 优先补 filter pushdown 与轻量 rerank
- 不把所有体验问题都归咎于“向量库不够强”

## 9.3 过度聊天化风险
Open Interview 总定位仍是 workbench，不是普通聊天 App。

### 应对
- citations / related questions / retrieval summary 仍保留
- shell 以对话为主，但不丢 grounded workbench 特征

---

## 10. 验收标准

P0 完成时，至少满足：
1. QA retrieval 主链已从“FTS + structured merge”升级为“SQLite FTS + Milvus vector + structured expansion”的 hybrid retrieval
2. Milvus 已进入正式向量召回主链，而不是仅停留在可选实验路径
3. retrieval log 能解释 query normalize / filters / FTS hits / Milvus hits / final context
4. assistant answer 来自真正的 grounded answer chain，而不是模板拼接
5. citations 仍保留且能自然展开查看
6. support 不足时，用户看到的是友好降级语义，而不是裸 409 工程错误
7. workbench-first 产品形态不丢失

---

## 11. 推荐任务拆分

建议拆成 4 个 bounded slices：

1. **Slice 9B — QA Milvus 向量检索基础层**
   - collection schema / index strategy / metadata 副本边界
   - embedding persistence / upsert / backfill / sync
   - Node adapter / health probe / local-dev 启动约定

2. **Slice 9C — QA Hybrid Retrieval 主链**
   - SQLite FTS + Milvus recall + metadata filters + structured expansion + lightweight rerank

3. **Slice 9D — QA Grounded Answer / Fallback / Rewrite**
   - grounded answer chain
   - `answer_mode`
   - friendly fallback
   - history-aware query rewrite

4. **Slice 9A — QA 对话式工作台 Shell**
   - 统一 `/qa` 与 `/qa/:sessionId`
   - 让 session / transcript / citations 面板成为稳定主体验

### 推荐执行顺序
默认推荐：
- **9B -> 9C -> 9D -> 9A**

说明：
- retrieval / answer contract 先稳定，会让 shell 的最终收口更少返工
- 若前端并行能力充足，9A 也可与 9D 后半段并行推进

---

## 12. Deferred option

只有在后续明确需要以下至少两项时，再考虑 LangGraph：
- 检索失败自动换策略
- 澄清式多轮节点
- 可恢复的分支状态图
- 多 retriever / multiple tool routing
- planner / executor 型产品内 agent flow

在此之前，**Milvus-first hybrid retrieval + LangChain grounded answer chain** 已足够支撑 QA 2.0 的主升级路径。
