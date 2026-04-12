[X] task1. 读取 AGENTS、coding workflow、L1 overview 与必要 rules，确认本次 QA 提示词优化的执行边界
[X] task2. 读取 QA / server-core L2 文档，并定位最新 QA session、当前 prompt 拼装与检索注入链路
[X] task3. 调整 QA 提示词与服务编排，确保回答优先围绕用户问题，本地材料只在相关时作为证据或补充
[X] task4. 补充或更新测试，覆盖“问题与本地材料弱相关时不要被材料劫持”的场景
[X] task5. 回环更新 QA 或 server-core L2 文档，记录新的提示词行为约束
[X] task6. 执行 typecheck / lint / 测试（若适用）与同构检查，确认改动无回归
