# Slice 9B — QA Milvus 向量检索基础层

- task_id: AT-V1-021-9B
- owner: execution
- status: todo
- goal: 实现 QA Milvus 向量检索的基础层。
- ask:
  1. 设计 Milvus collection schema 和索引策略，明确 metadata 副本边界。
  2. 实现 embedding 的持久化、upsert、backfill 和 sync 机制。
  3. 集成 Node.js adapter，并定义健康检查和本地开发启动约定。
- constraints:
  - P0 阶段只做 Milvus standalone，不做 cluster。
  - 确保 embedding persistence / upsert / backfill / sync 机制的稳定性。
  - Node adapter 需要清晰的接口定义，便于后续集成。
  - 考虑到当前宿主机资源，重点关注资源开销，保留低资源开发模式下的接口级 fallback。
- done_when:
  - Milvus collection schema 和索引策略已明确并实现。
  - embedding 的持久化、upsert、backfill 和 sync 机制已实现。
  - Node adapter 已集成，且健康检查和本地开发启动约定已定义。
  - 相关的测试用例已通过。
- refs:
  - `docs/qa-dialog-rag-plan.md`
  - `docs/technical-design.md`
  - `docs/tech-stack.md`
