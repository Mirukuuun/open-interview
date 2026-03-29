# Open Interview Import Feature

- doc_type: context_l2
- updated_at: 2026-03-26

## Manifest

- 路由：`/import`
- 主要目录：`src/features/import`、`src/app/api/sources*`
- 相关服务：`src/server/services/import-service.ts`
- 相关 schema：`src/lib/schemas/import.ts`

## Data Flow

1. 用户在 upload / paste / manual 三种模式中选择导入方式。
2. route handler 调用 import service，写入 `source_document` 或直接创建手工题目。
3. 如选择解析，继续创建 `parse_job`，让 review 流接手后续人工确认。
4. 页面右侧展示最近导入记录和最近任务，形成回流。

## Business Rules

- 导入页必须在单页内完成录入并展示下一步入口。
- `source_document.raw_text` 需要在导入后可用，即使来源是上传文件。
- 导入流程只负责创建原始记录和触发任务，不直接写 canonical 题库结果。
