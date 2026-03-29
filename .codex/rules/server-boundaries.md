# Server Boundary Rules

## 分层职责

- `src/server/api/*`：响应 envelope、错误映射、HTTP 边界工具。
- `src/server/services/*`：业务编排和用例层。
- `src/server/repositories/*`：数据库读写和查询聚合。
- `src/server/retrieval/*`：grounded QA 检索与重排。
- `src/server/db/*`：schema、migrations、连接和路径工具。

## 约束

- 不在 React 组件中直接 import repository 或数据库 client。
- 不在 route handler 中直接写复杂 SQL 或 provider 调用。
- Provider 逻辑必须通过 server-only adapter 边界暴露，避免散落在 UI 或 API 层。
- 数据真相优先落在结构化实体与 SQLite；检索只是增强层。

## 本仓库重点

- `source_document` 是原始输入真相源。
- `parse_job.result_json` 承接 AI 解析中间态，确认前不能直接当作 canonical 数据。
- `question_item` 是题库的 canonical 单元。
- grounded QA 必须保留引用和检索痕迹，不走“魔法答案框”。
