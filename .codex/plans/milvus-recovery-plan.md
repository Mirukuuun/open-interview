---
task: milvus-recovery
updated_at: 2026-03-29
status: in_progress
---

# Milvus Recovery Plan

## Goal

恢复 `open-interview-mvp.service` 的 Milvus 向量召回能力，并清空当前 QA foundation 的 pending sync backlog。

## Steps

1. 确认当前运行态
   - 检查 `open-interview-mvp.service` 的环境变量、`/api/health` 和 Milvus 容器健康。
   - 确认 backlog 规模、Milvus enabled 状态、同步入口可用性。

2. 修复运行配置
   - 为 `open-interview-mvp.service` 注入缺失的 `MILVUS_*` 环境变量。
   - 保持现有 SQLite、LLM 配置不变。

3. 执行向量回填
   - 重启应用服务使新环境生效。
   - 运行 QA Milvus sync job，直到 pending sync 明显下降或归零。

4. 验证结果
   - 检查 `/api/health` 的 `vector_backend` 字段。
   - 抽样验证 JVM 相关 query 不再是 `vector 命中 0` 且 retrieval trace 恢复正常。

5. 回环检查
   - 若涉及代码或文档变更，执行仓库规定检查。
   - 汇总根因、修复动作和残余风险。
