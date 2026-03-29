# Plans Directory

`.codex/plans/` 负责维护 Plan 规范说明；从 `2026-03-29` 起，任务执行记录统一写入 `docs/plans/`。

## 存放位置

- 每次任务都必须创建或更新 `docs/plans/[task]-plan.md`
- `docs/plans/` 不存在时，先创建目录
- `.codex/plans/` 中已有历史 Plan 可保留，但新任务不要继续写入这里

## 文件名建议

- `feature-name-plan.md`
- `slice-name-plan.md`
- `bug-name-plan.md`

## 记录格式

任务项逐行使用如下格式维护：

```text
[ ] task1. xxxxxxxxxxx
[ ] task2. xxxxxxxxxxx
[X] task3. xxxxxxxxxxx
```

规则如下：

- `[ ]` 表示未完成，`[X]` 表示已完成
- 每完成一项，就立刻更新对应状态
- 执行中若新增任务项，继续追加新的 `taskN.`
- Plan 需要覆盖本次任务涉及的所有计划项，便于追溯和断点继续

## 最低覆盖范围

- 文档读取 / 上下文确认
- 编码或文档改动
- 测试或 smoke 验证
- L2 文档回环
- 同构检查
- 若涉及部署，补充部署与回归验证
