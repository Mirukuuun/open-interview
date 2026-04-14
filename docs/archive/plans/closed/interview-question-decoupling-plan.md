[X] task1. 阅读 workflow、L1/L2 文档与相关 rules，确认面经题与题库题的现状边界和改造目标。
[X] task2. 修改数据库 schema、migration 与 repository/export，新增面经题、面经题标签和面经题到题库的正式关联模型。
[X] task3. 调整 parse review 确认导入链路与接口 schema，使面经确认只写面经实体，不再自动写入题库。
[X] task4. 新增面经题浏览/推荐/手动沉淀能力，并改造面经详情页与题库详情页的关联展示。
[X] task5. 更新对应 API 契约、L2 文档与执行计划状态，完成文档回环。
[X] task6. 补充或更新测试，覆盖面经确认解耦、面经题推荐/沉淀与题库来源回显。
[X] task7. 执行同构检查及必要校验，确认 `db:init`、`typecheck`、`lint`、`build` 和目标测试通过。
[X] task8. 在当前分支执行 commit、push、`corepack pnpm deploy:mvp` 并完成 `/import`、`/qa`、`/api/health` 回归验证。
