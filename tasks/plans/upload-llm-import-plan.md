# Open Interview · 文件上传 + LLM 解析入库技术方案

## 1. 目标

在现有 `source_document -> parse_job -> review -> confirm -> canonical题库` 主链上，补齐“文件上传作为输入方式”的能力：

1. 用户在 `/import` 上传文件。
2. 服务端将文件保存到本地存储。
3. 服务端抽取文件文本，创建 `source_document`。
4. 系统调用大模型，将文本解析为结构化 Q&A 候选。
5. 候选结果进入现有 review 队列。
6. 用户确认后，写入正式题库。

**本轮明确保留 review gate**：上传后不直接写 canonical 题库。

---

## 2. 当前现状

已经具备：
- `/import` 页面与导入工作台
- `source_documents` 数据模型
- `parse_jobs`
- `/review` 审核链路
- confirm 后写入 canonical 题库的逻辑

当前缺失：
- 真正可用的文件上传 API / UI
- 文件本地落盘
- `pdf/docx` 文本抽取
- 基于大模型的结构化解析

当前 `openClawParseSourceAdapter` 主要是 heuristic parser，不是 LLM parser。

---

## 3. 产品语义

### 默认用户路径

`上传文件 -> 自动解析 -> 进入待审核 -> 用户确认 -> 加入题库`

### 不做的事情
- 不默认自动入库
- 不绕过 review
- 不把“文件上传”建模成新的 `source kind`

说明：
- `kind` 仍然是领域语义：`interview_experience | knowledge_note | resume | manual_input`
- “文件上传”只是 source 的输入方式，不是新的业务类型

---

## 4. 总体架构

```text
/import
  -> POST /api/sources/upload (multipart/form-data)
    -> save file to storage/raw/
    -> extract text from file
    -> create source_document(raw_text + file metadata)
    -> optional create parse_job
      -> parseReviewService.createParseJob(...)
        -> llmParseSourceAdapter.parse(...)
          -> LLM client
          -> parseResultSchema validation
        -> save parse_job.result_json
  -> /review
    -> confirm
      -> 写入 question_items / answer_variants / source_question_refs
```

核心原则：
- 上传层负责“文件 -> 文本 -> source_document”
- 解析层负责“文本 -> 结构化 Q&A candidate”
- 入库层继续复用已有 confirm 流程

---

## 5. 范围定义

## P0
- 单文件上传
- 本地存储
- 支持 `txt / md / pdf / docx`
- 创建 `source_document`
- 自动触发解析（或提供 save only / save and review）
- LLM 输出结构化 Q&A 候选
- 进入现有 review / confirm 主链

## P1
- 长文档 chunking + merge
- retry / repair JSON
- 解析质量日志
- 更细的错误提示与 telemetry

## Out of Scope
- OCR
- 扫描版 PDF 图片识别
- 批量上传
- 对象存储
- 云端转码
- 自动无审核入库

---

## 6. 存储设计

### 文件落盘

建议目录：

```text
storage/raw/<source_document_id>/original.<ext>
```

例如：
- `storage/raw/src_123/original.pdf`
- `storage/raw/src_456/original.docx`

### `source_documents` 使用方式

继续复用现有字段：
- `file_name`
- `mime_type`
- `file_path`
- `raw_text`
- `kind`
- `title`

结论：**DB schema 不需要为 P0 做大改**。

可选增强（非必须）：
- `raw_text_length`
- `extraction_status`
- `extraction_error`

P0 可先不加，先靠接口响应与 parse job 状态承接。

---

## 7. API 设计

## 7.1 上传接口

### `POST /api/sources/upload`

`Content-Type: multipart/form-data`

字段建议：
- `file`: 文件本体（必填）
- `title`: 可选；未传则默认取文件名
- `kind`: 必填
- `source_url`: 可选
- `submit_mode`: `save_only | save_and_review`

### 成功响应

```json
{
  "ok": true,
  "data": {
    "source_document": {
      "id": "src_xxx",
      "title": "美团一面面经.pdf",
      "kind": "interview_experience",
      "file_name": "美团一面面经.pdf",
      "mime_type": "application/pdf",
      "file_path": "storage/raw/src_xxx/original.pdf",
      "parse_status": "pending"
    },
    "parse_job": {
      "id": "job_xxx",
      "status": "needs_review"
    }
  }
}
```

### 失败响应

```json
{
  "ok": false,
  "error": {
    "code": "unsupported_file_type",
    "message": "Only txt, md, pdf, docx are supported in this slice."
  }
}
```

错误码建议：
- `invalid_request`
- `missing_file`
- `unsupported_file_type`
- `file_too_large`
- `text_extraction_failed`
- `parse_failed`

## 7.2 parse job 触发

继续复用现有：
- `POST /api/parse-jobs`

但 upload API 在 `save_and_review` 模式下可以直接内部调用 service，不强制前端二次请求。

---

## 8. 服务拆分

建议新增 3 个服务层：

## 8.1 `file-storage-service.ts`
职责：
- 校验扩展名 / mime
- 生成安全文件名
- 创建目录
- 保存文件到 `storage/raw/`
- 返回 `filePath`

## 8.2 `file-text-extraction-service.ts`
职责：
- 根据类型抽取文本
- 统一清洗换行、空白、乱码片段
- 返回 `rawText`

建议支持：
- `txt`: UTF-8 文本读取
- `md`: UTF-8 文本读取
- `pdf`: PDF 文本抽取
- `docx`: DOCX 文本抽取

约束：
- 抽不出文本时直接报错，不进入题库链路
- 先不做 OCR fallback

## 8.3 `llm-parse-source-adapter.ts`
职责：
- 接收 `kind + title + rawText + jobType`
- 调大模型
- 输出并校验 `ParseResult`
- 必要时 retry / repair

说明：
- 这是对当前 `openClawParseSourceAdapter` 的升级/替换点
- 推荐保留旧 heuristic parser 作为 fallback 或测试基线，但主路径改为 LLM

---

## 9. LLM 调用设计

## 9.1 基本原则
- 服务端调模型，不让前端直连
- 模型输入是抽取后的 `raw_text`，不是原始二进制文件
- 输出必须是严格 JSON
- JSON 必须通过 `parseResultSchema`
- 不允许模型直接写 canonical 题库

## 9.2 输出结构

直接对齐现有 `parseResultSchema`：

```json
{
  "source_summary": "...",
  "source_kind_guess": "interview_experience",
  "interview_experience": {
    "company": "...",
    "role": "...",
    "round_info": "...",
    "summary": "...",
    "tags": ["redis", "mysql"]
  },
  "questions": [
    {
      "question_text": "Redis 为什么快？",
      "canonical_answer": "...",
      "source_answer": "...",
      "category": "distributed_system",
      "tags": ["redis"],
      "confidence": 0.91,
      "merge_hint_question_id": null
    }
  ],
  "warnings": []
}
```

## 9.3 Prompt 约束

系统提示应明确：
- 只提取原文中明确出现、或可直接归纳的问题与回答
- 不要凭空补充额外面试题
- 信息不足则字段设为 `null`
- 输出只允许 JSON
- 每条 question 尽量保留 source_answer
- 若原文只是零散笔记，可抽取 question candidate，但不要伪造完整答案
- 若存在重复问题，应在输出前尽量合并

## 9.4 调用模式

### 短文档：单次调用
适合：
- 面经
- 短笔记
- 中短简历

### 长文档：chunk + merge
适合：
- 长 PDF
- 多页合集

流程：
1. `raw_text` 按长度切 chunk
2. 每个 chunk 先提取局部 questions
3. 服务端按 normalized question text 合并去重
4. 必要时再做一次 final normalize 调用

建议阈值：
- 小于某个 token/char 阈值：单次调用
- 超过阈值：chunk 模式

P0 可以先留出接口，但实现尽量简单；P1 再细化优化。

---

## 10. review / confirm 复用策略

现有 `parseReviewService.confirmParseJob(...)` 已具备：
- create 新 question
- merge 到已有 question
- 创建 answer variants
- 创建 source refs
- 更新 tags/category

因此：
- **本轮不重写 confirm 逻辑**
- 只保证 LLM parse 产物继续使用相同的 `ParseResult` 数据契约

这样收益最大：
- 改动集中
- 兼容现有 review UI
- 易于回归验证

---

## 11. 去重与题库污染控制

为避免大模型把相近题反复导入：

## 11.1 parse 阶段
- 按 normalized question text 去重
- 保留最高置信版本
- 将相近候选尽量折叠

## 11.2 review 阶段
- 继续复用现有 `merge_hint_question_id`
- 对已有题显示 merge target
- 默认让用户确认 create / merge / skip

## 11.3 canonical 入库阶段
- 仍由人工确认触发
- 不做 silent auto-import

---

## 12. 前端改动

## `/import`
把现有 upload placeholder 替换为真实上传表单：
- 文件选择
- kind 选择
- title（可选）
- sourceUrl（可选）
- submit mode:
  - 仅保存
  - 保存并解析

## 成功反馈
- 上传成功
- 若已触发解析：提示“已进入审核队列”
- 提供跳转：
  - 去 `/review`
  - 返回 `/import`

## 错误反馈
- 不支持类型
- 文件过大
- 文本抽取失败
- 解析失败

P0 不做：
- 上传进度条
- 拖拽批量上传
- 多文件队列

---

## 13. 配置与 provider 抽象

建议新增独立 LLM client，而不是把产品逻辑绑到 OpenClaw 主会话：

```text
parseReviewService
  -> llmParseSourceAdapter
    -> llmClient
      -> provider(baseURL/apiKey/model)
```

建议环境变量：
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL_PARSE_INTERVIEW`
- `LLM_MODEL_PARSE_RESUME`（可后续）
- `LLM_TIMEOUT_MS`

原因：
- 产品运行时与助手运行时解耦
- 易于本地开发 / 部署
- 后续可替换 provider，不影响业务层

---

## 14. 风险与对策

## 风险 1：PDF / DOCX 抽文本质量不稳定
对策：
- P0 只支持文本可提取型文件
- 抽取失败时直接报错
- 不做 OCR 幻觉补偿

## 风险 2：模型输出 JSON 不稳定
对策：
- 严格 schema 校验
- 失败时 retry / repair 一次
- 仍失败则 parse job 标记 failed

## 风险 3：长文档一次调用效果差
对策：
- 预留 chunking 路径
- P1 加 chunk + merge

## 风险 4：题库被脏数据污染
对策：
- 保留 review gate
- 使用 merge_hint + 人工确认

---

## 15. 建议的实现顺序

### Slice 1：上传基础设施
- upload API
- 本地落盘
- txt/md 抽文本
- 创建 source_document

### Slice 2：解析接线
- upload 后触发 parse job
- review 队列可见
- 错误处理闭环

### Slice 3：LLM parser
- 接入大模型
- 输出对齐 `parseResultSchema`
- interview / knowledge_note 先跑通

### Slice 4：pdf/docx
- 加文件抽取器
- 做最小 smoke

### Slice 5：质量增强
- chunking
- retry / repair
- telemetry

---

## 16. 结论

本轮最优方案不是新造一套“文件直入题库”系统，而是：

**把文件上传补成现有 source 输入方式，再把 parse adapter 升级为 LLM parser，继续复用 review / confirm 主链。**

最终主路径：

`文件上传 -> 本地落盘 -> 抽文本 -> source_document -> LLM parse_job -> review -> confirm -> 加入题库`

这样改动面最小、验收最清晰、对现有系统扰动也最小。
