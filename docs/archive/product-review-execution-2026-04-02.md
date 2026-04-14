# Open Interview 产品 Review 执行方案（2026-04-02）

- doc_type: execution_plan
- audience: product / maintainers
- status: proposed
- created_at: 2026-04-02
- source: `docs/product-review-2026-04-02.md`

> 目标不是重复 review 结论，而是把建议收敛成可交付的切片、顺序和验收口径。

---

## 1. 执行原则

- 优先修已有主链路的衔接，再追加新能力。当前最高杠杆是让用户更顺地走完 `导入 -> 审核 -> 题库 -> 练习 / QA`。
- 优先复用已存在能力，不重复造轮子。已有 promote / merge、related questions、recent exams、practice profile 等基础能力，应以“入口强化 + 体验补齐”为主。
- 安全底线前置。公开部署且强调长期积累的产品，备份与导出不应长期落后于留存增强功能。
- 每个切片必须有清晰验收，不以“感觉更顺”作为完成标准。

## 2. 优先级结论

### P0：下一阶段必须落地

1. 首次体验与审核衔接
2. QA 核心可用性补齐
3. 数据安全基线

### P1：P0 稳定后推进

1. 定向练习入口
2. 面经沉淀闭环增强

### P2：差异化深化

1. 简历深挖补齐

## 3. 口径修正

- 题库详情并非完全缺少关联浏览，当前已存在 `相关题目` 与 `来源面经题`；本轮应补的是题库到 QA / 练习的动作入口，以及列表层的关系暴露，而不是重做详情关联模块。
- 面经详情并非没有沉淀能力，当前已有 create / merge / promoted 状态；本轮应补的是 CTA 显眼度与列表聚合视图，而不是重做 promote 后端主链。

## 4. 执行切片

### Slice A. 首次体验与审核衔接

`优先级：P0`

目标：
- 让新用户第一次进入时知道产品主链路。
- 让已有数据的用户默认回到题库，而不是反复落在导入页。
- 让待审核任务在导航层就可感知。

触达范围：
- `/`
- `/import`
- workbench sidebar / nav data

包含：
- 根路由按数据状态动态分流：
  - 无题库数据时进入 `/import`
  - 已有题库数据时进入 `/questions`
- `/import` 空状态增加轻量引导卡片，解释核心流程与下一步动作。
- 左侧导航为 `审核队列` 接入 `needs_review` badge。

不包含：
- 独立 marketing landing page
- 复杂 onboarding wizard
- 导入完成后的站内通知中心

验收：
- 空库首次访问 `/` 时，进入 `/import` 且能看到流程引导。
- 有题库数据时访问 `/`，进入 `/questions`。
- 存在 `needs_review` 任务时，侧栏显示待审核数量；为 0 时不显示或不强调。

依赖 / 备注：
- 需要一个轻量 workspace summary 或导航摘要来源，统一提供题库数量与 review 待处理数量。
- 与该切片一起顺手统一相关页面的时间格式。

### Slice B. QA 核心可用性补齐

`优先级：P0`

目标：
- 让 QA 回答从“可读”升级到“可直接使用”。
- 让题库详情能直接进入基于当前题目的 drill-down 问答。

触达范围：
- `/qa`
- `/qa/:sessionId`
- `/questions/:questionId`

包含：
- assistant answer 支持 markdown 渲染，至少覆盖：
  - 列表
  - 粗体 / 标题
  - 代码块
  - 段落与换行
- 题库详情页增加“基于这题发起 QA”入口。
- 题库到 QA 的入口优先走 query prefill，不引入新的 session 绑定协议。

不包含：
- 动态 prompt suggestions
- “引用上一轮回答继续追问”的专用交互组件
- QA 首页改造成调试工作台

验收：
- QA 回答中的列表、代码块、强调格式正确渲染，不再以原始纯文本展示。
- 从题库详情点击入口后，可进入 `/qa` 并自动带入该题相关问题草稿。
- 引用、related questions、retrieval trace 的现有折叠结构保持不变。

依赖 / 备注：
- 需要安全可控的 markdown 渲染方案。
- `docs/ui-flows.md` 中既有 `Question Bank -> AI Review` 契约以此切片为准落地。

### Slice C. 数据安全基线

`优先级：P0`

目标：
- 给“长期积累”的产品一个最低可接受的数据安全底线。

触达范围：
- SQLite 运维脚本 / 文档
- 题库导出接口或脚本

包含：
- 提供可定时执行的 SQLite 备份脚本或命令入口。
- 补充 restore / restore-check 文档。
- 提供题库 JSON 导出能力，导出 canonical question 基础信息、答案、标签、分类与来源关联摘要。

不包含：
- 云端托管备份体系
- 多格式导出一次全做完
- Anki / Markdown 导出首轮支持

验收：
- 能生成带时间戳的数据库备份文件。
- 能从备份恢复到本地可运行实例，并有明确操作说明。
- 能导出题库 JSON，且数据字段对后续迁移或二次利用足够稳定。

依赖 / 备注：
- 首轮导出以 question bank 为主，不强行覆盖 QA session / practice history / resume 全量域。

### Slice D. 定向练习入口

`优先级：P1`

目标：
- 让 practice 从“考完一次”变成“能围绕薄弱项继续练”。

触达范围：
- `/practice`
- practice profile / recent exams 卡片

包含：
- 从 `weak_areas` 或长期画像维度一键进入定向练习。
- practice 页面显式展示当前定向维度与退出过滤入口。
- 定向练习优先基于现有维度 catalog，不额外引入“错题本”数据模型。

不包含：
- 完整错题本
- 收藏夹
- 趋势线 / 历史对比视图

验收：
- 用户能从最近考试或长期画像点击某个弱项进入对应维度练习。
- 练习题池只包含符合该维度映射的题。
- 用户可一键退出过滤，回到全量随机练习。

依赖 / 备注：
- 复用现有 `dimension_weights_json` 与 practice dimension 配置。
- 等定向练习验证有效后，再决定是否追加错题本与趋势视图。

### Slice E. 面经沉淀闭环增强

`优先级：P1`

目标：
- 强化“来源面经 -> 标准题库题”的沉淀感知，让用户更容易完成手动沉淀。

触达范围：
- `/interviews`
- `/interviews/:interviewId`

包含：
- 强化已有 promote/create/merge CTA 的视觉层级与状态反馈。
- 面经列表增加按公司浏览的聚合视图或分组折叠。
- 在列表或详情中更明确展示“已沉淀到题库”的状态。

不包含：
- 自动沉淀
- 新 promote backend
- 复杂多维分析面板

验收：
- 面经详情中，沉淀动作在首屏可见，不需要深滚动才看到。
- 面经列表可按公司快速浏览，不再只有纯平表格。
- 已沉淀与未沉淀状态可快速区分。

依赖 / 备注：
- 现有 promote 主链已可用，本切片以 UI 与浏览结构增强为主。

### Slice F. 简历深挖补齐

`优先级：P2`

目标：
- 把“项目表达训练”从占位能力补成明确差异化路径。

触达范围：
- `/resume`
- `/resume/projects/:projectId`
- `/resume/projects/:projectId/session/:sessionId`

包含：
- 用真实数据替换 resume landing placeholder。
- 在项目 deep dive session 中补 coach hints。
- 为项目亮点提供结构化展示或编辑入口。

不包含：
- 完整 mock interview 评分体系首轮一次做完
- 脱离 project context 的通用聊天入口

验收：
- `/resume` 不再主要由 placeholder 组成。
- deep dive session 能展示 coach hints。
- 项目页面能沉淀结构化亮点，而不是只保留自由文本。

依赖 / 备注：
- 该切片放在核心主链稳定之后，避免过早分散交付资源。

## 5. 暂缓项

- 全局搜索：价值明确，但依赖跨题库 / 面经 / QA session 的统一索引与结果分组，不适合作为当前第一优先级。
- 键盘快捷键：适合在核心动作和布局稳定后集中补齐。
- 长期趋势线、考试对比视图：在定向练习验证有效前先不展开。
- 动态 QA suggestions：先打通题库到 QA 的上下文入口，再决定是否按题库内容生成建议问题。
- 完整移动端适配：不单列为独立 epic，但每个切片都要保证手机访问至少可读、可滚动、主操作不坏。
- 答案质量反馈闭环：要和 canonical answer / variant 的维护策略一起设计，不宜临时追加局部按钮。

## 6. 推荐排期

### 迭代 1

- Slice A. 首次体验与审核衔接
- Slice B. QA 核心可用性补齐
- 顺手修复：时间格式统一

### 迭代 2

- Slice C. 数据安全基线
- Slice D. 定向练习入口

### 迭代 3

- Slice E. 面经沉淀闭环增强

### 迭代 4

- Slice F. 简历深挖补齐

## 7. 完成定义

- 每个切片都必须同步补齐文档、手工验收步骤和最小 smoke 验证。
- 每个切片都应避免引入新的大一统抽象；优先在现有 feature 边界内增量交付。
- 若交付资源不足，先保证 `Slice A + Slice B + Slice C`，其余切片允许顺延。
