# AT-V1-020 QA 2.0 Execution Plan

## 背景 / 目标
- 把 QA 从 grounded retrieval demo 升级为真实 Hybrid RAG。
- Milvus 进入正式召回主链，LangChain 接 rewrite / grounded answer，页面收口到三栏工作台。

## 执行步骤
1. 扩展 session / retrieval schema 与 migration。
2. 接 Milvus search、rewrite chain、grounded answer chain。
3. 重写 QA retrieval / service / API。
4. 收口 `/qa` 与 `/qa/:sessionId` 页面。
5. 更新文档并执行仓库检查。

## 验证
- `corepack pnpm db:init`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`
- `python3 .catpaw/scripts/check_isomorphism.py --check`
