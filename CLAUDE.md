# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**本文件仅作为 Claude Code 的入口指引，完整的仓库规范、架构、Context 和 Rules 索引见 `AGENTS.md`。**

## 快速命令参考

```bash
corepack pnpm install          # 安装依赖 (Node.js 22+)
corepack pnpm dev              # 本地开发 http://localhost:3000
corepack pnpm build            # 生产构建
corepack pnpm lint             # ESLint
corepack pnpm typecheck        # TypeScript 严格检查
corepack pnpm test             # Vitest 全量运行 (vitest run)
npx vitest run tests/foo.test.ts  # 运行单个测试文件
corepack pnpm db:init          # 初始化 SQLite (storage/open-interview.sqlite)
corepack pnpm db:generate      # Schema 变更后生成 Drizzle migration
corepack pnpm deploy:mvp       # 部署：db:init → build → 重启服务 → reload Caddy
```

## 核心约定（摘要）

- **Workflow 入口**：任务路由和开发流程由全局 CC skills（task-router → dev-workflow）驱动，项目级 context 和 rules 按需读取。
- **合并门槛**：`db:init` + `typecheck` + `lint` + `build` 全部通过。
- **代码风格**：2 空格、分号、双引号；组件/类型 PascalCase，文件 kebab-case；用 `@/` 别名导入。
- **测试**：放 `tests/*.test.ts`，使用 Vitest；vitest.config.ts 已配置 `@` alias 和 node 环境。
- **提交**：Conventional Commits（`feat:` / `fix:` / `docs:` …）。
- **语言**：默认中文回复。

## 详细规范

所有架构说明、Context 索引、Rules 索引、文档约定、部署细节、Agent 专用说明等，统一参考 [`AGENTS.md`](./AGENTS.md)。
