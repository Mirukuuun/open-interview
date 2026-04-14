[X] task1. 阅读 AGENTS.md、coding workflow、相关 L1/L2 context、rules 与 prompt/schema/adapter 文件，确认 interview parse 的当前答案契约
[X] task2. 修改 interview-parse prompt，删除不必要的预算表述，并改为统一 `answer` 字段与新的答案生成规则
[X] task3. 调整 parse-source 适配与兼容逻辑，使模型单字段答案可接入现有 parse review 链路
[X] task4. 更新相关测试与必要的 L2 文档回环
[X] task5. 执行同构检查、针对性测试、typecheck、lint、db:init 与 build，记录结果
[X] task6. 执行 `corepack pnpm deploy:mvp` 完成服务器部署
[X] task7. 回归验证 `https://career.mimiruku.cn/import`、`https://career.mimiruku.cn/qa` 与 `https://career.mimiruku.cn/api/health`
