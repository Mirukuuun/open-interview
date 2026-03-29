# AT-V1-020 Slice 9B Plan

## 背景 / 目标
- 当前 QA retrieval 仍停留在 SQLite chunk/FTS 主链，Milvus-first 只存在于文档。
- 本轮需要把 Slice 9B 落成真实代码底座：SQLite 继续做业务真相源，Milvus 成为向量检索后端边界。

## 影响范围
- `src/server/db/schema/*`
- `src/server/repositories/*`
- `src/server/vector/*`
- `src/server/jobs/*`
- `src/server/retrieval/hybrid-qa-retrieval.ts`
- `src/server/health/*`
- `src/lib/schemas/*`
- `.codex/context/*`
- `docs/*`

## 编码步骤
1. 定义 SQLite 侧 chunk / embedding-state / sync-state / sync-job schema，并补 migration。
2. 新增 Milvus collection schema、config、adapter 和 OpenClaw embedding client。
3. 新增 QA Milvus foundation orchestration 与 sync job skeleton，覆盖 chunk -> embedding -> Milvus upsert / delete。
4. 把 QA retrieval 接到 foundation summary，保留当前 FTS 主链但暴露 Milvus sync 状态和 warning。
5. 扩展 health payload，补齐文档回环。

## 测试 / Smoke
- `corepack pnpm db:init`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`
- `python3 .catpaw/scripts/check_isomorphism.py --check`
- SQLite schema / migration 冒烟检查
- 若条件允许，补充本地 fake Milvus / embedding smoke

## L2 文档回环
- 更新 `open-interview-qa-feature.md`
- 更新 `open-interview-server-core-feature.md`

## 同构检查
- 显式执行 `.catpaw` isomorphism check
