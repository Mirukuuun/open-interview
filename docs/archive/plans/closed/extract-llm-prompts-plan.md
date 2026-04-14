[X] task1. 阅读 AGENTS、coding workflow、L1/L2 context 与 server-boundaries 规则，确认本次 prompt 抽离任务的边界
[X] task2. 盘点当前硬编码 LLM prompt 的来源文件与复用方式，确定统一的 `src/server/prompts/` 目录结构
[X] task3. 新增 prompt 模块，抽离 parse、QA rewrite、QA answer、practice grading 的固定 prompt 文案与构造函数
[X] task4. 更新现有 adapter / retrieval / service 对 prompt 的引用，保证行为不变
[X] task5. 回环更新 server-core L2 文档，反映新的 `src/server/prompts` 目录职责
[X] task6. 执行同构检查与必要校验，至少覆盖 `python3 .catpaw/scripts/check_isomorphism.py --check`、`corepack pnpm typecheck`、`corepack pnpm lint`
[X] task7. 执行 `corepack pnpm build`，确认生产构建通过
[ ] task8. 当前工作区包含大量与本次任务无关的未提交改动，暂缓执行 `corepack pnpm deploy:mvp`，待确认是否允许连同这些改动一起部署
