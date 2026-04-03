# Open Interview

Open Interview 是一个 **workbench-first、local-first** 的面试准备工作台：
把原始面经 / 知识笔记 / 简历资料导入系统，经过解析、人工确认与结构化沉淀，形成可浏览、可检索、可引用的题库与复习工作台，并在其上提供 grounded AI 问答与简历深挖能力。

## 项目目标

Open Interview 要解决的不是“再做一个聊天壳”，而是把面试准备过程收口成一套真正可持续积累的系统：

- **导入**：支持文本 / 文件资料进入系统
- **解析**：把原始资料转成结构化候选结果
- **确认**：允许人工审阅后再写入 canonical 数据
- **沉淀**：形成问题、答案、标签、来源、简历项目等可复用资产
- **检索**：支持 Question Bank / Interview Notes / Resume 的浏览与搜索
- **Grounded AI**：在可追溯证据基础上做 QA / 复习辅助，而不是无依据聊天

## 当前技术方向（简版）

- 前端 / Web：Next.js App Router + React + Tailwind
- 主业务数据库：SQLite + Drizzle + `better-sqlite3`
- 词法检索：SQLite FTS5
- 语义检索：Milvus standalone（当前 canonical 方向）
- AI 边界：OpenClaw server-only adapters
- 产品形态：**workbench-first，不是 generic chat app**

## 文档地图

### 项目入口
- `README.md`（本文件）
  - 项目背景、目标、当前状态、文档导航

### 技术设计
- `docs/technical-design.md`
  - 技术总设计主入口
  - 最新技术架构图
  - 模块边界 / 主链路 / roadmap / 子文档索引

### 持续维护的技术子文档
- `docs/tech-stack.md`：技术栈、实现边界、运行时与部署约束
- `docs/data-model.md`：核心实体、关系、状态流转
- `docs/api-schema.md`：HTTP API 契约
- `docs/ui-flows.md`：路由、页面、交互流程
- `docs/qa-dialog-rag-plan.md`：QA / RAG 专项设计

### Plan / Task / Retrospective / Templates
- `tasks/slices/`：所有实现切片与执行边界
- `tasks/plans/`：阶段性计划与执行计划留痕
- `tasks/retrospectives/`：复盘记录
- `tasks/templates/`：执行模板（如 Codex prompt 模板）

## 当前项目状态

当前仓库已经不再停留在 MVP 骨架阶段，而是进入了**已跑通主链、持续做收口与打磨**的状态。当前明确可见的主能力包括：

- **导入 / 解析 / 审核 / 入库主链已稳定存在**：`/import`、`/review`、`/review/:jobId` 与对应 API 已形成完整闭环。
- **Question Bank / Interview / Resume / Practice / QA 五条工作台主线都已落地**，不是只有单一聊天入口。
- **QA 2.0 主链已落地**：SQLite 作为业务真相源，SQLite FTS + Milvus 组成 hybrid retrieval，回答层使用 grounded answer chain，并保留 citations / retrieval trace / answer_mode / history-aware rewrite。
- **Interview 与 Question Bank 已正式解耦**：面经审核确认默认写入 `interview_question`，后续再按需 promote / merge 到 `question_item`，不再把两者混成同一实体。
- **Practice 已进入“随机刷题 + 10 题 mock exam + 长期能力画像”阶段**，不是早期的简单随机问答。
- **LLM prompt 基础设施已转成 `src/prompts/*.md` + server prompt loader**，中文化与 prompt 维护边界已经收口到固定目录。

当前更像是在做：**基于已落地主链继续 polish、补文档、做质量收口**，而不是还在“准备开始做 QA 2.0”。

更完整的当前方案见：
- `docs/technical-design.md`
- `docs/qa-dialog-rag-plan.md`
- `docs/ui-flows.md`
- `docs/data-model.md`

## 本地运行

### 环境要求
- Node.js 22+
- `corepack pnpm`

### 启动
```bash
corepack pnpm install
corepack pnpm dev
```

默认开发地址：
```text
http://localhost:3000
```

说明：
- `3000` 是本地开发端口，不是当前服务器上的正式服务端口。

### 初始化本地数据库
```bash
corepack pnpm db:init
```

默认 SQLite 文件：
```text
storage/open-interview.sqlite
```

## 常用命令

```bash
corepack pnpm dev
corepack pnpm build
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm db:init
corepack pnpm db:generate
corepack pnpm deploy:mvp
```

## 部署约定

- 当前线上正式实例由 `open-interview-mvp.service` 托管。
- 正式 Next.js 服务端口固定为 `3106`。
- `career.mimiruku.cn` 由 `caddy.service` 反向代理到 `127.0.0.1:3106`。
- 面向当前服务器的需求完成后，默认要执行一次：

```bash
corepack pnpm deploy:mvp
```

`deploy:mvp` 会执行 `db:init`、`build`、重启应用服务、reload Caddy，并回归 `career.mimiruku.cn` 的基础页面。

## 文档维护规则（简版）

- **项目级说明**：更新 `README.md`
- **全局技术架构 / 主路线 / roadmap**：更新 `docs/technical-design.md`
- **某个专项领域的详细设计**：更新对应子文档
- **需求迭代 / 执行记录 / 验收 / 复盘**：写入 `tasks/` 体系，不混进 canonical 技术设计

一句话：

> `README.md` 是项目入口，`docs/technical-design.md` 是技术总入口，子文档各管一摊，`tasks/` 负责全过程留痕。
