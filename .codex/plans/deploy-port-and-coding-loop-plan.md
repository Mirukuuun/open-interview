# Deploy Port And Coding Loop Plan

## 背景 / 目标

- 当前公网域名 `career.mimiruku.cn` 已切到最新实例，但仓库内缺少明确的部署约定与复用脚本。
- 需要把线上服务端口 `3106`、反向代理关系、以及“需求完成后要部署”的要求纳入 coding loop。
- 同时清理旧的 `3000` 临时实例，避免后续再次混淆正式服务与开发端口。

## 影响范围

- 运行态：旧 `3000` Next.js 进程
- 脚本：`scripts/deploy-mvp.sh`
- 命令入口：`package.json`
- 仓库规范：`AGENTS.md`、`.codex/workflows/coding.md`
- Context / 文档：`.codex/context/open-interview-architecture.md`、`.codex/context/open-interview-dependencies.md`、`docs/tech-stack.md`、`README.md`

## 执行步骤

1. 停止旧的 `3000` Next.js 进程，确认只保留 `3106` 正式实例。
2. 新增仓库级部署脚本，固化 `db:init -> build -> restart service -> reload caddy -> smoke` 流程。
3. 在 workflow、context 和项目说明中写明：
   - 本地开发默认端口仍是 `3000`
   - 线上正式服务端口是 `3106`
   - 需求完成后默认执行 `corepack pnpm deploy:mvp`
4. 做一次部署命令与公网 smoke 验证。

## 验证

- `ss -ltnp '( sport = :3000 or sport = :3106 )'`
- `corepack pnpm deploy:mvp`
- `curl -x '' -sS -o /dev/null -w '%{http_code}\n' https://career.mimiruku.cn/import`
- `curl -x '' -sS -o /dev/null -w '%{http_code}\n' https://career.mimiruku.cn/qa`
