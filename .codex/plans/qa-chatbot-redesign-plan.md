# QA Chatbot Redesign Plan

## 背景 / 目标

- 当前 `QA` 页仍偏工作台与调试面板，不符合“完整、简洁、可连续追问的 chat bot 模式”预期。
- 当前回答链路在本地 grounding 不足时会直接返回拒答文案，导致体验僵硬。
- 本次目标是把 `QA` 页重构为聊天式界面，并调整回答策略为“始终回答 + 明确 support 强弱”。

## 影响范围

- 前端：`src/app/(workbench)/qa/*`、`src/features/qa/*`
- 服务与检索：`src/server/services/qa-session-service.ts`、`src/server/retrieval/qa-grounded-answer-chain.ts`、`src/server/repositories/qa-session-repository.ts`
- API / schema：`src/app/api/qa/sessions/*`、`src/lib/schemas/qa.ts`
- 文档：`.codex/context/open-interview-qa-feature.md`、`docs/ui-flows.md`、`docs/api-schema.md`
- 测试：`tests/qa-rag.test.ts`

## 编码步骤

1. 调整回答链路，去掉 no-support 直接拒答的早退逻辑，改为 grounded / mixed / general answer 一体化生成。
2. 补齐 QA session 删除能力，支持左侧列表中新建、切换、删除会话。
3. 重写 QA 页面布局，默认只暴露对话与 session 管理，把引用和 retrieval trace 收敛到折叠区域。
4. 同步更新 API / schema / 文档契约。

## 测试或 Smoke 验证

- 更新 `tests/qa-rag.test.ts`
- 执行 `corepack pnpm test`
- 执行 `corepack pnpm lint`
- 执行 `corepack pnpm typecheck`

## L2 文档回环

- 更新 `.codex/context/open-interview-qa-feature.md`

## 同构检查

- 执行 `python3 .catpaw/scripts/check_isomorphism.py --check`
