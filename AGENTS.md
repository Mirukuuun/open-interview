# 仓库指南

## 项目概要

- Open Interview 是一个 local-first 的面试工作台，覆盖导入、解析审核、题库沉淀、随机练习 / 模拟考试、grounded QA 和简历项目深挖。
- 当前实现以 Next.js App Router + SQLite/Drizzle 为主干，路由层保持轻量，核心业务能力沉在 `src/server/*`。
- 项目级 context 和 rules 按需读取；任务路由和开发流程由各 Agent 平台各自的 workflow 机制驱动，本文件不规定具体工具链。

## 文档约定

### 需求文档结构

新需求按以下约定组织在 `docs/<NNN>-<slug>/` 下：

```
docs/
├── dev-info/INDEX.md             # 需求索引（active/done 状态）
└── <NNN>-<slug>/                 # 单需求根
    ├── design.md                 # 设计文档
    ├── plan.md                   # 执行计划（简单需求直接平铺）
    ├── roadmap.md                # 路线图（仅复杂需求）
    ├── changelog.md              # 完成时撰写
    ├── tasks/TX.Y-*.md           # 任务拆分
    ├── handoffs/H<N>-*.md        # 交接文档
    ├── tests/                    # 需求相关测试
    └── m<X>-<phase-slug>/       # L2 按 phase 嵌套
        ├── plan.md
        ├── tasks/
        ├── handoffs/
        └── tests/
```

### 归档文档

- `docs/archive/` — 历史需求文档与设计评审
- `docs/archive/plans/closed/` — 已关闭的历史任务计划（37 个），作为项目演进记录
- `docs/reference/` — 产品参考文档（api-schema、data-model、ui-flows、tech-stack、technical-design 等）

新需求不再使用上述目录，统一走 `docs/<NNN>-<slug>/` 结构。

## Context 索引

- L1：`.codex/context/open-interview-overview.md`，项目总览、模块导航、L2 索引。
- L1：`.codex/context/open-interview-architecture.md`，分层边界、关键数据流、运行时拓扑。
- L1：`.codex/context/open-interview-domain.md`，核心实体、状态迁移、业务词汇。
- L1：`.codex/context/open-interview-dependencies.md`，依赖栈、仓库命令、文档依赖。
- L2：`.codex/context/open-interview-workbench-feature.md`，workbench shell 与导航骨架。
- L2：`.codex/context/open-interview-import-feature.md`，导入、上传与 parse job 触发。
- L2：`.codex/context/open-interview-review-feature.md`，review queue 与人工确认流程。
- L2：`.codex/context/open-interview-questions-feature.md`，题库浏览与 canonical 问题契约。
- L2：`.codex/context/open-interview-practice-feature.md`，随机练习、模拟考试与评分结果。
- L2：`.codex/context/open-interview-interviews-feature.md`，面经来源浏览与上下文展示。
- L2：`.codex/context/open-interview-qa-feature.md`，grounded QA 会话与引用约束。
- L2：`.codex/context/open-interview-resume-feature.md`，简历、项目与深挖会话。
- L2：`.codex/context/open-interview-server-core-feature.md`，server/service/repository/db 边界。

## Rules 索引

- `.codex/rules/README.md`：rules 总入口与按改动范围读取规则的使用说明。
- `.codex/rules/documentation-loop.md`：L1 / L2 / L3 导航、`@feature` 和结构化注释要求；触达文档或核心业务文件前优先阅读。
- `.codex/rules/typescript-nextjs.md`：TypeScript、Next.js App Router、`src/app`、`src/features`、`src/components` 的实现约束。
- `.codex/rules/server-boundaries.md`：`src/server`、数据库、检索、适配器以及 service / repository 的边界约束。

## 项目结构与模块组织

- `src/app/` 放置 Next.js App Router 页面和 API 路由处理器 `route.ts`。路由层保持精简，业务逻辑下沉到服务层。
- `src/features/` 按业务流组织工作台界面，包括 `import`、`review`、`questions`、`practice`、`interviews`、`qa`、`resume`。
- `src/components/` 放可复用 UI 组件，`src/lib/` 放共享 schema 和工具，`src/server/` 放适配器、数据库 schema/migrations、repositories、retrieval 和 services。
- `docs/` 存放产品与契约文档及需求开发文档；本地生成物位于已忽略的 `storage/` 和 `tmp/`。

## 构建、测试与开发命令

- `corepack pnpm install`：安装依赖，要求 Node.js `22+`。
- `corepack pnpm dev`：启动本地开发服务，默认地址为 `http://localhost:3000`；该端口只用于本地开发。
- `corepack pnpm db:init`：应用 SQLite migrations，并创建 `storage/open-interview.sqlite`；可通过 `OPEN_INTERVIEW_DB_PATH` 或 `DATABASE_URL` 覆盖路径。
- `corepack pnpm lint`：运行仓库 ESLint 配置。
- `corepack pnpm typecheck`：执行 TypeScript 严格类型检查，不输出构建产物。
- `corepack pnpm test`：Vitest 全量运行（等价于 `vitest run`）。单文件运行用 `npx vitest run tests/foo.test.ts`。
- `corepack pnpm build`：验证生产构建可用，并为当前 `HEAD` 记录可复用的本地 `.next` 构建元数据。
- `corepack pnpm deploy:mvp`：执行服务器部署脚本，默认完成 `db:init`、优先复用当前 `HEAD` 的本地 `.next` 构建（否则回退到 `.next-runtime.stage` 重 build）、重启 `open-interview-mvp.service`、reload `caddy.service` 并验证 `career.mimiruku.cn`。
- `corepack pnpm db:generate`：在 schema 变更后生成 Drizzle migration 草稿；提交前需要人工检查 SQL。

## 部署约定

- 当前线上正式服务端口固定为 `3106`，由 `open-interview-mvp.service` 托管。
- `career.mimiruku.cn` 通过 `caddy.service` 反向代理到 `127.0.0.1:3106`。
- `3000` 仅保留给本地 `next dev` 或临时调试使用，不能视为正式实例端口。
- 面向当前服务器交付的需求，在完成编码、文档和检查后，先在当前分支执行一次 `commit` 与 `push`，再执行 `corepack pnpm deploy:mvp`；部署是 coding loop 的一部分，不单独省略。

## 代码风格与命名约定

- 遵循现有 TypeScript 风格：2 空格缩进、保留分号、使用双引号。
- React 组件和类型使用 PascalCase；文件名使用 kebab-case，例如 `import-actions-panel.tsx`。
- 优先使用 `@/` 别名导入，避免过深的相对路径。
- 输入输出校验放在 `src/lib/schemas/` 的 Zod 边界层；客户端组件不要直接承载数据库或服务逻辑。

## 测试指南

- 合并门槛仍然是 `db:init`、`typecheck`、`lint` 和 `build` 四项全部通过；`corepack pnpm test` 推荐在触达已有测试覆盖的链路时一并跑通，但未强制。
- 当前 `tests/` 下使用 Vitest 驱动，已覆盖的链路包括：`parse-source` / `parse-job-async`（导入解析）、`practice-service`（随机练习 / 模拟考试）、`qa-rag` / `prompt-markdown`（QA grounded answer 与提示词）、`llm-provider-health` / `openclaw-provider-config`（LLM 适配器）、`interview-question-decoupling` / `single-answer-question-bank` / `taxonomy-display`（题库与面经契约）、`build-artifact`（部署产物）。
- 尚未覆盖的高风险区域：review queue / 审核确认、vector sync（milvus / qa 同步 job）、`src/app/api/*` 路由层；触达这些模块时优先补测试，或在变更说明中写清手工 HTTP / smoke 验证范围。
- 新增自动化测试放在 `tests/` 下，使用 `*.test.ts` 或 `*.test.tsx` 命名；计划中追加 React Testing Library 覆盖客户端组件。
- 高风险但暂不适合单测的改动，优先复用或补充 `scripts/` 下的 smoke 脚本（当前有 `scripts/smoke-7e-long-document.mjs`）。

## 提交与 Pull Request 规范

- 提交信息遵循现有 Conventional Commits 风格，如 `feat: ...`、`fix: ...`、`docs: ...`。
- 每个 PR 保持聚焦，只覆盖一个 slice 或一条用户流。说明中应包含摘要、关联任务或文档、涉及的 routes/services、验证结果、已知风险和 reviewer 关注点。
- 涉及界面变更时附截图；涉及 schema、migration 或新增环境变量时要显式说明。

## Agent 专用说明

- 除非用户明确要求其他语言，后续仓库协作默认使用中文回复。
- 开始任何任务前，先明确用户需求，并判断当前属于「询问」还是「执行」。
- 若用户是在询问现状、原因、含义、方案、风险、评审结论或可行性，默认按「询问」处理；此时只提供答案、分析、建议或备选方案，不得擅自修改文件、运行交付链路、提交、推送或部署。
- 若用户明确要求落地修改、执行命令、补测试、提交或部署，才按「执行」处理；执行范围必须严格限制在用户明确授权的边界内。
- 若需求边界不清、同时存在「询问」与「执行」两种解读，先向用户澄清，禁止基于猜测扩展任务范围。
- 可以主动向用户提供建议、风险提示或可选方案，但"提供建议"不等于"获得执行授权"；除非用户明确同意，否则不能把建议直接落地。

## 文档与配置提示

- 修改 API 契约或核心实体前，先核对 `docs/reference/api-schema.md`、`docs/reference/data-model.md` 和 `docs/reference/ui-flows.md`。
- 不要提交 `.env*`、SQLite 文件或 `storage/raw/` 中的原始上传内容；这些都属于本地临时产物。
