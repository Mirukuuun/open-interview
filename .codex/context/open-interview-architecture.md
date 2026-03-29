# Open Interview Architecture

- doc_type: context_l1
- layer: L1
- updated_at: 2026-03-28
- canonical_for: 分层边界、运行时拓扑、关键数据流

## 分层结构

- UI Shell：`src/app` 与 `src/features/workbench` 提供统一导航、顶部栏与页面装配。
- Feature UI：`src/features/*` 承载 import、review、questions、interviews、qa、resume 六条主业务流。
- Shared UI / Schemas：`src/components/*` 与 `src/lib/schemas/*` 提供复用组件和输入输出边界。
- Service Layer：`src/server/services/*` 负责业务编排、错误建模、文件处理和 session 流程。
- Persistence / Retrieval：`src/server/repositories/*`、`src/server/retrieval/*`、`src/server/db/*` 负责数据库、浏览查询、检索日志和 grounded QA 召回。

## 运行时拓扑

- Web runtime：Next.js App Router，页面与 API 在同一仓库内运行。
- Local dev runtime：`corepack pnpm dev` 默认监听 `3000`，仅用于开发态。
- Production app runtime：`open-interview-mvp.service` 托管 `next start`，正式服务监听 `3106`。
- Edge proxy：`caddy.service` 将 `career.mimiruku.cn` 反向代理到 `127.0.0.1:3106`。
- Primary storage：SQLite，本地文件默认落在 `storage/open-interview.sqlite`。
- File storage：原始上传与派生内容放在 `storage/` 目录下。
- Async model：解析流程通过 `parse_job` 持久化状态，后续可扩展本地 worker。

## 关键调用链

### 导入

`/import` UI -> route handler -> `import-service` -> 文件存储 / 文本抽取 -> repository -> `source_document`

### 解析审核

review queue / detail UI -> parse review service -> `parse_job.result_json` -> 人工确认 -> canonical entities

### Grounded QA

QA UI -> session service -> retrieval module -> repositories / search -> 带引用的回答与检索日志

## 架构约束

- Route handler 只做 HTTP 解包、调用 service、封装 response envelope。
- 业务逻辑与 provider 交互必须停留在 server-only 层。
- canonical 数据遵循 `docs/data-model.md`，API 契约遵循 `docs/api-schema.md`。
- workbench 页面必须显式呈现空态、加载态、错误态与可重试状态。

## 当前实现状态

- UI workbench 和主要路由已建立。
- SQLite schema、migrations、repositories、部分 services 已落地。
- provider adapter、后台 worker、检索增强仍处于逐步接入阶段。
