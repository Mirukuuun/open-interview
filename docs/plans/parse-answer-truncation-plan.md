[X] task1. 阅读 AGENTS.md、coding workflow、相关 context 与 rules，确认排查范围覆盖 import/review/server parse 链路
[X] task2. 定位上传解析的 prompt、模型调用、结构化输出与后处理逻辑，确认答案丢失发生在哪一层
[X] task3. 结合样例输入复核解析结果与数据库字段，判断是 prompt 抽取失真还是代码截断/清洗导致
[X] task4. 若确认存在实现问题则完成修复，并补充必要说明或验证
[X] task5. 评估是否需要更新对应 L2 文档，完成文档回环
[X] task6. 执行同构检查与必要校验，整理结论反馈
[X] task7. 按补充建议进一步强化 prompt，对 source_answer 保留原文完整答案块的要求做更直接约束
[X] task8. 复跑 parse-source 相关测试与必要校验，确认强化 prompt 不引入回归
