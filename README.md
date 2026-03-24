# Open Interview

Open Interview 是一个 local-first 的工作台应用，用于导入面试记录、审阅解析候选结果、沉淀规范化题库，并支持 grounded AI review 工作流。

当前仓库包含 Slice 0 的启动基线，以及 Slice 1 的数据层基础实现：

- 基于 Next.js App Router + TypeScript + Tailwind 的基础工程
- 带左侧导航和顶部栏的工作台壳层
- 面向 import、review、questions、interviews、QA、resume 流程的规范路由占位页
- 为后续 Slice 预留的 `src/features` 与 `src/server` 目录结构
- 一个占位的 `/api/health` 路由
- 面向 MVP 核心实体的 Drizzle schema、SQLite migrations 与 repository helpers

## 环境要求

- Node.js 22+
- `corepack pnpm`（本仓库通过 Corepack 管理 pnpm）

## 本地运行

1. 安装依赖：

```bash
corepack pnpm install
```

2. 启动开发服务器：

```bash
corepack pnpm dev
```

3. 打开应用：

```text
http://localhost:3000
```

根路由会在空产品启动状态下重定向到 `/import`。

## 初始化本地数据库

应用 SQLite schema，并创建本地 DB 文件：

```bash
corepack pnpm db:init
```

默认会写入 `storage/open-interview.sqlite`。如需覆盖，可设置
`OPEN_INTERVIEW_DB_PATH`；若使用 SQLite 文件路径，也可设置 `DATABASE_URL`。

当前仓库以 `src/server/db/migrations/*.sql` 作为迁移真相源；`db:init`
/ `db:migrate` 会按这些 SQL 文件顺序应用迁移。

## 常用命令

```bash
corepack pnpm build
corepack pnpm db:generate
corepack pnpm db:init
corepack pnpm lint
corepack pnpm typecheck
```

说明：
- `db:init` / `db:migrate`：初始化或应用本地 SQLite 迁移。
- `db:generate`：仅用于 schema 变更后草拟新的 migration 草稿，不是本地启动必跑步骤；生成物需要人工确认后再纳入版本控制。

## 当前 Slice 边界

当前刻意纳入的内容：

- 已搭好的 UI 壳层与路由占位页
- 与规范文档对齐的静态空状态
- 用于 health/status 的轻量 server stub
- 基于 SQLite/Drizzle 的核心 MVP 数据层 schema 与 migration 启动路径

当前刻意暂缓的内容：

- import、parse、review、search 与 QA 的业务逻辑
- SQLite FTS5 virtual tables 与 retrieval 执行逻辑
- 超出当前 Slice 1 范围的 resume/session 表
- auth、部署基础设施与 provider wiring
