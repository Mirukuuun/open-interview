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

当前项目已经跑通了基础工作台主干，并完成过多轮面向 import / review / canonicalization / QA 的设计与实现推进。当前 QA / RAG 主线已收口到：

- SQLite 作为业务真相源
- SQLite FTS 负责 lexical recall
- Milvus 负责语义向量检索
- 应用层负责 hybrid retrieval、structured expansion、merge/rerank
- 回答层走 grounded answer chain，并保留 citations / retrieval trace / answer_mode

更完整的当前方案见：
- `docs/technical-design.md`
- `docs/qa-dialog-rag-plan.md`

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
