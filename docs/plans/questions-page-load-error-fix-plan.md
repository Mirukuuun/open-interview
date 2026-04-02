[X] task1. 阅读 workflow、rules、workbench/questions 相关 context，并确认 `/questions` 故障范围与当前部署契约
[X] task2. 复现并定位 `/questions` 页面无法加载的根因，确认是运行中服务与磁盘 `.next` 产物不一致导致的 chunk 错配
[X] task3. 修改 Next.js 构建/运行配置，让正式服务使用独立 runtime dist 目录，避免默认 `.next` 构建污染线上运行产物
[X] task4. 修改部署脚本，固化 runtime dist drop-in、stage build、产物切换与 `/questions` 回归校验
[X] task5. 更新与部署契约相关的上下文文档，记录 runtime dist 隔离约定
[X] task6. 执行同构检查、`db:init`、`lint`、`typecheck`、`build`，确认改动可交付
[ ] task7. 执行 `git commit`、`git push`、`corepack pnpm deploy:mvp`，并回归 `/questions`、`/import`、`/qa`、`/api/health`
