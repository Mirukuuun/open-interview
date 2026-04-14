[X] task1. 阅读 workflow、L1/L2 文档与相关 rules，定位审核项重试约束。
[X] task2. 修改审核项重试判定与服务逻辑，允许任何未入库审核项触发重试。
[X] task3. 更新对应测试或补充验证，覆盖非 failed 状态的重试场景。
[X] task4. 回环更新 L2 文档与执行计划状态。
[X] task5. 执行同构检查及必要校验，确认本地改动通过 `db:init`、`typecheck`、`lint`、`build` 与目标回归测试。
[X] task6. 执行 `corepack pnpm deploy:mvp`，并回归验证服务重启成功、`/api/health` 可达、重试接口可接受未入库审核项。
