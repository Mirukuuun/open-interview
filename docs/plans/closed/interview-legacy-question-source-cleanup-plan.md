[X] task1. 明确用户需求与约束，确认目标是清理历史上“实际为题目却作为面经导入”的数据，且不能影响关联题库题目。
[X] task2. 阅读 coding workflow、L1/L2 context、数据模型与相关 rules，确认面经与题库的解耦边界。
[X] task3. 核对候选脏数据范围，确认仅处理没有 `interview_question`、但保留 `source_question_refs` 的历史 legacy-only 面经记录。
[X] task4. 备份当前 SQLite 数据库，并以事务方式执行最小化清理：移除错误的面经投影，不改动题库题与来源关联。
[X] task5. 复核清理后的面经列表数量、题库来源保留情况与关键查询结果，确认题库题未受影响。
[X] task6. 确认本次无需更新 L2 文档，执行同构检查并同步回填 Plan 完成状态。
[X] task7. 对同一批 6 份历史来源补充执行 `source_document` 归档，并确认题库来源引用仍可读。
