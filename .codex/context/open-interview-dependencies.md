# Open Interview Dependencies

- doc_type: context_l1
- layer: L1
- updated_at: 2026-04-03
- canonical_for: 外部依赖、开发命令、文档依赖

## 运行时依赖

- `next` / `react` / `react-dom`：Web runtime 与 App Router UI。
- `zod`：服务边界与 schema 校验。
- `drizzle-orm` / `better-sqlite3`：SQLite 访问与类型化 schema。
- `clsx` / `tailwind-merge`：样式组合辅助。
- `@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono`：字体资源。

## 开发依赖

- `typescript`：严格类型检查。
- `eslint` / `eslint-config-next`：静态检查。
- `tailwindcss` / `@tailwindcss/postcss`：样式构建。
- `drizzle-kit`：migration 草稿生成。
- `@types/*`：Node 与 React 类型。

## 仓库命令

- `corepack pnpm dev`
- `corepack pnpm db:init`
- `corepack pnpm db:generate`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`
- `corepack pnpm deploy:mvp`

## 文档依赖

初始化和编码默认先读：

- `docs/tech-stack.md`
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
- 与目标变更相关的 `tasks/slices/*.md`

## 本地环境假设

- Node.js `22+`
- `pnpm` 通过 Corepack 管理
- SQLite 数据文件默认写入 `storage/open-interview.sqlite`
- 本地开发端口默认是 `3000`
- 当前服务器上的正式 Next.js 服务监听 `3106`，由 `open-interview-mvp.service` 托管
- `career.mimiruku.cn` 通过 `caddy.service` 反向代理到 `127.0.0.1:3106`
- 正式服务通过 systemd drop-in 固定注入 `NEXT_DIST_DIR=.next-runtime`，运行时产物与默认 `.next` 隔离
- 本地生成物在 `storage/` 和 `tmp/`，不纳入版本控制

## 交付约定

- 面向当前服务器交付的需求，完成代码与检查后，先在当前分支执行 `commit` 与 `push`，再执行 `corepack pnpm deploy:mvp`
- `pnpm build` 默认写 `.next`，并记录一份与当前 `HEAD` 对齐的可复用构建元数据，供部署链路判断是否可以直接复用
- `deploy:mvp` 负责 `db:init`、优先复用当前 `HEAD` 的 `.next` 到 `.next-runtime.stage`（若不可复用则回退到重新构建 `.next-runtime.stage`）、切换到 `.next-runtime`、启动正式服务、reload 代理与公网 smoke 验证
- 日常 `corepack pnpm build` 默认只更新本地 `.next`，不应再影响正式服务当前使用的 runtime 产物
