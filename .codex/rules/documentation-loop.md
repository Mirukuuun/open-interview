# Documentation Loop Rules

## L1 -> L2 -> L3

- L1 只负责总览、模块边界、命名方式和 L2 索引。
- L2 只维护 `Manifest / Data Flow / Business Rules`。
- L3 才承载实现、测试和局部注释。

## `@feature`

- 核心业务文件需要显式指向所属 L2 文档。
- `@feature` 应优先指向 `.codex/context` 下的 feature 文档文件名。
- 新增 `@feature` 后，必须确认目标文档存在。

## 结构化注释

核心职责文件建议在头部维护：

```text
[POS] 该文件在局部系统里的职责
[IN] 主要输入
[OUT] 主要输出或副作用
@feature xxx-feature.md
@AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及 @feature 指向的 L2 文档。
```

## 回环要求

- 行为或契约变化后，先更新 L2，再确认 L1 索引是否需要同步。
- 不依赖 hook 代替手动检查；`python3 .catpaw/scripts/check_isomorphism.py --check` 必须显式执行。
