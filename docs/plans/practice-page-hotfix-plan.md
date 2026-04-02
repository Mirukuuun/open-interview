[X] task1. 复现 `/practice` 页面报错并定位服务端异常来源，确认是否为定向练习改动引入的回归。
[X] task2. 修复 practice 最近考试弱项数据的历史兼容问题，避免 legacy weak area key 导致页面渲染失败。
[X] task3. 更新 practice L2 文档，补充历史弱项维度兼容与降级展示规则。
[ ] task4. 执行本地检查与 smoke 验证，至少覆盖 `/practice` 页面恢复、同构检查、`db:init`、`typecheck`、`lint`、`build`。
[ ] task5. 部署 hotfix 并回归验证线上 `/practice` 与 `/api/health`。
