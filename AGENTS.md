# 仓库指南

## 项目概要
- Open Interview 是一个 local-first 的面试工作台，覆盖导入、解析审核、题库沉淀、grounded QA 和简历项目深挖。
- 当前实现以 Next.js App Router + SQLite/Drizzle 为主干，路由层保持轻量，核心业务能力沉在 `src/server/*`。
- 后续协作默认先走 `.codex` 规范目录中的 `workflows`、`context`、`rules`、`plans`。

## Workflow 索引
- `.codex/workflows/coding.md`：代码开发 / 需求开发的标准 workflow。凡是实现功能、修复缺陷、调整接口、补测试、更新文档回环或交付链路的任务，必须先完整阅读并遵循该文档，再进入后续开发。
- `.codex/workflows/init.md`：仓库初始化、规范接入、Context 补齐或索引整理的 workflow。

## Context 索引
- L1：`.codex/context/open-interview-overview.md`，项目总览、模块导航、L2 索引。
- L1：`.codex/context/open-interview-architecture.md`，分层边界、关键数据流、运行时拓扑。
- L1：`.codex/context/open-interview-domain.md`，核心实体、状态迁移、业务词汇。
- L1：`.codex/context/open-interview-dependencies.md`，依赖栈、仓库命令、文档依赖。
- L2：`.codex/context/open-interview-workbench-feature.md`，workbench shell 与导航骨架。
- L2：`.codex/context/open-interview-import-feature.md`，导入、上传与 parse job 触发。
- L2：`.codex/context/open-interview-review-feature.md`，review queue 与人工确认流程。
- L2：`.codex/context/open-interview-questions-feature.md`，题库浏览与 canonical 问题契约。
- L2：`.codex/context/open-interview-interviews-feature.md`，面经来源浏览与上下文展示。
- L2：`.codex/context/open-interview-qa-feature.md`，grounded QA 会话与引用约束。
- L2：`.codex/context/open-interview-resume-feature.md`，简历、项目与深挖会话。
- L2：`.codex/context/open-interview-server-core-feature.md`，server/service/repository/db 边界。

## Rules 索引
- `.codex/rules/README.md`：rules 总入口与按改动范围读取规则的使用说明。
- `.codex/rules/documentation-loop.md`：L1 / L2 / L3 导航、`@feature` 和结构化注释要求；触达文档或核心业务文件前优先阅读。
- `.codex/rules/typescript-nextjs.md`：TypeScript、Next.js App Router、`src/app`、`src/features`、`src/components` 的实现约束。
- `.codex/rules/server-boundaries.md`：`src/server`、数据库、检索、适配器以及 service / repository 的边界约束。

## Plans 索引
- `.codex/plans/README.md`：计划目录约定。每次任务都必须在 `docs/plans/[task]-plan.md` 维护执行计划，并在执行过程中持续更新完成状态。

## 项目结构与模块组织
- `src/app/` 放置 Next.js App Router 页面和 API 路由处理器 `route.ts`。路由层保持精简，业务逻辑下沉到服务层。
- `src/features/` 按业务流组织工作台界面，包括 `import`、`review`、`questions`、`interviews`、`qa`、`resume`。
- `src/components/` 放可复用 UI 组件，`src/lib/` 放共享 schema 和工具，`src/server/` 放适配器、数据库 schema/migrations、repositories、retrieval 和 services。
- `docs/` 存放产品与契约文档，`tasks/slices/` 存放分片实现任务；本地生成物位于已忽略的 `storage/` 和 `tmp/`。

## 构建、测试与开发命令
- `corepack pnpm install`：安装依赖，要求 Node.js `22+`。
- `corepack pnpm dev`：启动本地开发服务，默认地址为 `http://localhost:3000`；该端口只用于本地开发。
- `corepack pnpm db:init`：应用 SQLite migrations，并创建 `storage/open-interview.sqlite`；可通过 `OPEN_INTERVIEW_DB_PATH` 或 `DATABASE_URL` 覆盖路径。
- `corepack pnpm lint`：运行仓库 ESLint 配置。
- `corepack pnpm typecheck`：执行 TypeScript 严格类型检查，不输出构建产物。
- `corepack pnpm build`：验证生产构建可用。
- `corepack pnpm deploy:mvp`：执行服务器部署脚本，默认完成 `db:init`、`build`、重启 `open-interview-mvp.service`、reload `caddy.service` 并验证 `career.mimiruku.cn`。
- `corepack pnpm db:generate`：在 schema 变更后生成 Drizzle migration 草稿；提交前需要人工检查 SQL。

## 部署约定
- 当前线上正式服务端口固定为 `3106`，由 `open-interview-mvp.service` 托管。
- `career.mimiruku.cn` 通过 `caddy.service` 反向代理到 `127.0.0.1:3106`。
- `3000` 仅保留给本地 `next dev` 或临时调试使用，不能视为正式实例端口。
- 面向当前服务器交付的需求，在完成编码、文档和检查后，默认还要执行一次 `corepack pnpm deploy:mvp`；部署是 coding loop 的一部分，不单独省略。

## 代码风格与命名约定
- 遵循现有 TypeScript 风格：2 空格缩进、保留分号、使用双引号。
- React 组件和类型使用 PascalCase；文件名使用 kebab-case，例如 `import-actions-panel.tsx`。
- 优先使用 `@/` 别名导入，避免过深的相对路径。
- 输入输出校验放在 `src/lib/schemas/` 的 Zod 边界层；客户端组件不要直接承载数据库或服务逻辑。

## 测试指南
- 当前仓库尚未提交正式自动化测试；当前合并门槛是 `db:init`、`typecheck`、`lint` 和 `build` 全部通过。
- 对高风险改动，优先补充 `scripts/` 下的 smoke 脚本，或在变更说明中写清手工 HTTP 验证范围。
- 若新增自动化测试，请放在 `tests/` 下，并使用 `*.test.ts` 或 `*.test.tsx` 命名。规划中的测试栈是 Vitest 和 React Testing Library。

## 提交与 Pull Request 规范
- 提交信息遵循现有 Conventional Commits 风格，如 `feat: ...`、`fix: ...`、`docs: ...`。
- 每个 PR 保持聚焦，只覆盖一个 slice 或一条用户流。说明中应包含摘要、关联任务或文档、涉及的 routes/services、验证结果、已知风险和 reviewer 关注点。
- 涉及界面变更时附截图；涉及 schema、migration 或新增环境变量时要显式说明。

## Agent 专用说明
- 除非用户明确要求其他语言，后续仓库协作默认使用中文回复。
- 代码开发 / 需求开发默认命中编码开发场景，必须先遵循 `.codex/workflows/coding.md`；执行中再按改动范围读取 `.codex/context/*` 和 `.codex/rules/*`。

## 文档与配置提示
- 修改 API 契约或核心实体前，先核对 `docs/api-schema.md`、`docs/data-model.md` 和 `docs/ui-flows.md`。
- 不要提交 `.env*`、SQLite 文件或 `storage/raw/` 中的原始上传内容；这些都属于本地临时产物。
