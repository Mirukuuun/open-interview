---
task: openclaw-provider-config
updated_at: 2026-03-29
status: in_progress
---

# OpenClaw Provider Config Plan

## Goal

将 embedding provider 配置与常规 LLM provider 配置解耦，支持独立 env / provider 选择，并消除 embedding 误回退到 `LLM_*` / `sub2api` 的行为。

## Steps

1. 统一配置解析
   - 抽出 OpenClaw provider 配置读取与 env 解析共享模块。
   - 定义 LLM 与 embedding 各自的优先级和 provider 选择规则。

2. 接入 adapter
   - `llm-client` 改为复用共享配置解析，并支持 `LLM_PROVIDER_NAME`。
   - `embedding-client` 改为只读取 embedding 自己的配置链路，并支持 `EMBEDDING_PROVIDER_NAME`。

3. 测试与文档
   - 补充 provider 配置解析测试。
   - 更新 `docs/tech-stack.md` 和相关 `.codex/context/*` 文档。

4. 回环验证
   - 运行测试 / 类型检查。
   - 重启 `open-interview-mvp.service`，确认 health 与 QA 检索维持正常。
