# Open Interview Import Feature

- doc_type: context_l2
- updated_at: 2026-04-02

## Manifest

- 路由：`/import`
- 主要目录：`src/features/import`、`src/app/api/sources*`
- 相关服务：`src/server/services/import-service.ts`
- 相关 schema：`src/lib/schemas/import.ts`

## Data Flow

1. 用户在 upload / paste / manual 三种模式中选择导入方式。
2. route handler 调用 import service，写入 `source_document` 或直接创建手工题目。
3. 如选择解析，继续创建 `parse_job` 并立即返回成功提示；实际解析在后台异步执行，让 review 流接手后续人工确认。
4. 页面右侧展示最近导入记录，并在桌面端以与导入方式区同高的独立滚动区形成回流；空库首访时在导入区上方先展示 onboarding banner，引导“导入 -> 审核 -> 题库/练习/QA”的回路。

## Business Rules

- 导入页必须在单页内完成录入并展示下一步入口。
- 首次空库状态下，导入页需要把 onboarding 提示放在主录入区之前，强调后续会进入审核队列而不是停留在导入页。
- 上传与最近来源在桌面端需要保持同高；最近来源独立滚动，避免挤压主录入区。
- `source_document.raw_text` 需要在导入后可用，即使来源是上传文件。
- 导入流程只负责创建原始记录和触发任务，不直接写 canonical 题库结果。
- 导入页触发解析成功后，应提示用户前往审核队列查看进度，而不是同步等待解析完成。
- 上传表单不向用户暴露本地存储路径等内部实现细节。
