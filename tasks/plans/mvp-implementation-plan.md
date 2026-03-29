# Open Interview MVP 实现计划

- task_id: open-interview-mvp-plan-2026-03-23
- owner: Mimi
- status: in_progress
- goal: 先把 Open Interview 做成一个可用的、可持续演进的面试准备系统 MVP，优先闭环“导入 -> 解析 -> 确认 -> 入库 -> 浏览/搜索”，再接 OpenClaw 做 AI 增强。
- scope: Web 优先；Android 首版只做消费型能力，不追求和 Web 同步覆盖全部输入能力。
- artifact_root: `~/.openclaw/projects/open-interview/`

## 0. MVP 定义

### MVP 必须回答的核心问题
1. 用户能不能方便地把面经/八股导进来？
2. 系统能不能把原始资料稳定转成结构化题库？
3. 用户能不能方便地按题库/面经双视角查看和搜索？
4. 在已有题库基础上，AI 问答能不能真正帮到复习？

### 本轮不追求
- 多人协作
- 复杂权限系统
- 向量搜索/复杂推荐
- Android 完整输入能力
- 高保真模拟面试评分系统

## 1. MVP 范围切分

### MVP-1：基础资产闭环（必须先完成）
目标：把系统从“资料堆”变成“结构化可搜索题库”。

包含：
- 文件上传（txt/md/pdf/docx 可逐步支持）
- 粘贴文本导入
- 手动录入单条 Q&A
- 原始资料解析任务
- 解析结果确认页
- Question Bank 列表 / 搜索 / 分类 / 详情
- Interview Notes 列表 / 搜索 / 详情
- 基础标签体系
- SQLite + FTS 搜索

### MVP-2：AI 增强问答
目标：让题库真正“可用”，不只是可看。

包含：
- 基于题库的 AI 问答页
- 问答前检索（keyword / tag / category / source）
- 回答带引用
- 相关问题推荐
- 问答历史保存

### MVP-3：简历深挖（轻版）
目标：把系统从题库工具升级为面试准备工作台。

包含：
- 简历上传与文本提取
- 项目抽取
- 项目视角的 AI 深挖问答
- mock interview session 基础版
- transcript 保存

## 2. 推荐实现顺序

不要按“页面”做，要按“主链能力”做：

1. 数据模型
2. 导入与解析
3. 确认与入库
4. 浏览与搜索
5. AI 问答
6. 简历深挖
7. Android 消费端

## 3. 分阶段计划

## Phase 0：项目初始化 / 设计冻结
预估：0.5 ~ 1 天

### 目标
把技术栈、目录结构、MVP 边界一次性收紧，避免后面反复返工。

### 交付物
- 项目目录初始化
- MVP plan（本文档）
- 技术栈拍板
- 统一数据模型草案
- API 草案

### TODO
- [ ] 拍板技术栈：`Next.js + SQLite` 还是 `FastAPI + React + SQLite`
- [ ] 约定目录结构（web / server / mobile / docs）
- [ ] 定义核心实体：source / interview / question / answer_variant / resume_project / session
- [ ] 定义 parse result schema
- [ ] 定义 OpenClaw adapter 边界

### 建议结论
如果以“尽快做出可用 Web MVP”为第一目标，优先：

**Next.js（Web + API）+ SQLite + Prisma/Drizzle + OpenClaw adapter**

原因：
- 演进路径最短
- 你已有 HTML 展示基础，迁移自然
- 后续接 Android 也能复用 HTTP API

---

## Phase 1：基础存储与导入链路
预估：2 ~ 3 天

### 目标
完成“资料进系统”的第一条主链。

### 交付物
- 数据库 schema v1
- 本地文件存储目录
- 导入页（上传 / 粘贴 / 手动 Q&A）
- SourceDocument 创建
- ParseJob 创建与状态流转

### 功能点
- 上传文件到本地存储
- 保存 metadata 到 DB
- 粘贴文本直接生成 source
- 手动单条 Q&A 直接走轻量入库流程
- 解析任务状态：`pending / running / success / failed / needs_review`

### TODO
- [ ] 建库：questions / sources / interviews / tags / mappings / parse_jobs / sessions
- [ ] 实现文件上传 API
- [ ] 实现粘贴文本导入 API
- [ ] 实现手动 Q&A 导入 API
- [ ] 实现 source list API
- [ ] 实现 parse job 表与轮询 API
- [ ] 建立本地存储约定：`storage/raw/`、`storage/parsed/`、`storage/transcripts/`

### 完成标准
- 用户至少能把资料放进系统
- 后端能看到 source 记录
- 页面能展示导入成功与任务状态

---

## Phase 2：解析确认与正式入库
预估：2 ~ 4 天

### 目标
完成“AI 解析 -> 用户确认 -> 正式题库”的关键闭环。

### 交付物
- OpenClaw parse adapter
- parse result schema
- review/confirm UI
- dedupe / merge 基础逻辑
- 入库 API

### 功能点
- 给 OpenClaw 传原始文本，请它抽取：
  - 面经信息
  - questions
  - candidate answers
  - tags/category
- 解析结果先不直写正式库，而是进入 review
- 用户可：
  - 勾选要入库的问题
  - 修改问题文案
  - 修改分类/标签
  - 选择“新增”还是“合并到已有问题”

### TODO
- [ ] 设计 parse result JSON schema
- [ ] 实现 OpenClaw parse 调用
- [ ] 做基础去重：按 question normalized text 检查近似重复
- [ ] 实现 review 页面
- [ ] 实现 confirm/import API
- [ ] 写入 question / interview / source_question_ref

### 完成标准
- 一篇面经可以稳定导入并转成结构化题库
- 用户能阻止脏数据进入正式库

---

## Phase 3：题库 / 面经双视图 + 搜索
预估：2 ~ 3 天

### 目标
完成产品的第一个真正可用版本。

### 交付物
- Question Bank 页面
- Interview Notes 页面
- 搜索 API
- 详情页
- tag/category/filter 能力

### 功能点
- 按题库维度查看
- 按面经维度查看
- 关键词搜索 question / answer / source title / summary
- 按 category / tag / source filter
- question detail 展示：
  - 标准答案
  - 来源列表
  - 关联面经
  - 相关问题

### TODO
- [ ] SQLite FTS / 全文检索建好
- [ ] 搜索 API：`/search`
- [ ] question list API / detail API
- [ ] interview list API / detail API
- [ ] 前端 filter + search UX
- [ ] question detail 的关联信息区块

### 完成标准
- 用户不需要翻文件，直接在系统里完成查找和复习
- 题库/面经双视图可切换

---

## Phase 4：AI 问答（基于题库 grounding）
预估：2 ~ 3 天

### 目标
让系统从“静态知识库”升级为“可交互复习工具”。

### 交付物
- AI 问答页
- retrieval + OpenClaw QA adapter
- 引用展示
- 问答历史

### 功能点
- 用户提问
- 系统先搜索 top-k question/source
- 把检索结果发给 OpenClaw
- OpenClaw 输出 grounded answer
- 页面展示：
  - answer
  - references
  - related questions

### TODO
- [ ] 设计 QA input/output schema
- [ ] 实现 retrieval pipeline
- [ ] 实现 OpenClaw QA adapter
- [ ] 持久化 QA session
- [ ] 前端展示引用与相关问题

### 完成标准
- AI 问答不是空口回答，而是明显建立在你的题库之上
- 至少能支撑“八股复习问答”这条链

---

## Phase 5：简历深挖（轻版）
预估：3 ~ 4 天

### 目标
做出一个足够有用但不太重的 mock interview / 项目深挖版本。

### 交付物
- 简历上传
- 项目抽取
- 项目列表
- resume deep dive session
- session transcript

### 功能点
- 上传简历文本/文件
- AI 解析出项目、亮点、技术栈、可追问点
- 用户选一个项目开始深挖
- OpenClaw 以模拟面试官身份多轮追问
- transcript 可回看

### TODO
- [ ] resume parse schema
- [ ] resume upload / parse API
- [ ] project list/detail API
- [ ] mock interview session API
- [ ] transcript view UI

### 完成标准
- 至少支持单项目、多轮深挖
- 用户能回看提问与自己的回答

---

## Phase 6：Android 首版（消费型）
预估：3 ~ 5 天

### 目标
先把最有价值的移动端使用场景做出来，而不是追求功能全覆盖。

### 包含
- 登录/配置（如果需要）
- 首页摘要
- 题库浏览
- 搜索
- AI 问答
- mock interview transcript 查看

### 暂不优先
- 复杂文件上传
- 大量编辑操作
- 解析确认流

### 完成标准
- Android 能满足通勤/碎片时间复习场景

## 4. 目录结构建议

```text
open-interview/
  docs/
    mvp-implementation-plan.md
    api-schema.md
    data-model.md
    ui-flows.md
  web/
  server/              # 如果走前后端分离
  mobile/android/
  storage/
    raw/
    parsed/
    transcripts/
  scripts/
```

如果走 Next.js 单仓方案，可改成：

```text
open-interview/
  docs/
  apps/web/
  apps/android/
  packages/shared/
  storage/
  scripts/
```

## 5. 建议优先级（按真实价值排序）

### P0
- 数据模型
- 导入
- 解析
- 确认
- 搜索
- 题库/面经双视图

### P1
- AI 问答
- 引用
- 问答历史

### P2
- 简历深挖
- mock interview session
- Android 首版

## 6. 关键风险与控制

### 风险 1：解析结果质量不稳定
控制：
- 必须有 review/confirm 层
- parse schema 固定
- 首版只支持少量稳定字段

### 风险 2：题库重复/脏化
控制：
- 入库前做 normalized question 去重
- 保留 source refs，不强行合并所有答案

### 风险 3：AI 问答看起来聪明但不 grounded
控制：
- 强制先检索再回答
- 前端展示引用
- 没有命中时允许保守回答

### 风险 4：Web / Android 同时推进拖慢主线
控制：
- 先把 Web 做成管理面板
- Android 只做消费型首版

## 7. 我建议的第一周目标

只盯住一件事：

**做出一个可演示的 Web MVP-1。**

### 第一周 done when
- 可以上传/粘贴一份面经
- 可以看到解析任务状态
- 可以在 review 页面确认问题
- 可以进入题库列表查看新导入的问题
- 可以搜索命中它
- 数据层已经为后续轻量 RAG 预留 chunk/embedding 接口，不需要二次推翻

## 8. 当前结论

最优路线不是“先上 AI 聊天”，而是：

**先把导入、解析确认、题库/面经双视图和搜索做稳。**

这样一来：
- 你马上拥有一个真实可用的积累系统
- 后面接 OpenClaw 问答和简历深挖才有坚实地基
- Android 也能顺着这套 API 自然长出来

## TODO 总表
- [ ] 技术栈拍板
- [ ] 数据模型与 API schema
- [ ] 项目初始化
- [ ] 导入链路
- [ ] 解析确认链路
- [ ] 题库/面经双视图 + 搜索
- [ ] AI 问答
- [ ] 简历深挖轻版
- [ ] Android 消费型首版
�深挖轻版
- [ ] Android 消费型首版
��路
- [ ] 解析确认链路
- [ ] 题库/面经双视图 + 搜索
- [ ] AI 问答
- [ ] 简历深挖轻版
- [ ] Android 消费型首版

- [ ] 简历深挖轻版
- [ ] Android 消费型首版
