# Rules Index

`.codex/rules` 只放执行时需要反复读取的约束，不复制 `AGENTS.md` 全文。

当前规则入口：

- `documentation-loop.md`：L1 / L2 / L3 导航、`@feature` 和结构化注释要求。
- `typescript-nextjs.md`：TypeScript、Next.js App Router、UI 组件层的基本约束。
- `server-boundaries.md`：route handler、service、repository、storage 的分层边界。

使用方式：

- 触达文档或核心业务文件时，先读 `documentation-loop.md`。
- 触达 `src/app`、`src/features`、`src/components` 时，读 `typescript-nextjs.md`。
- 触达 `src/server`、数据库、检索、适配器时，读 `server-boundaries.md`。
