# Open Interview 数据安全基线

- doc_type: operations
- audience: maintainers
- status: active
- updated_at: 2026-04-02

## 1. 备份

默认命令：

```bash
corepack pnpm db:backup
```

默认会把 SQLite 备份写到 `storage/backups/`，文件名带 UTC 时间戳，例如：

```text
storage/backups/open-interview-20260402T154500Z.sqlite
```

可选环境变量：

- `OPEN_INTERVIEW_DB_PATH` / `DATABASE_URL`：覆盖源数据库路径
- `OPEN_INTERVIEW_BACKUP_DIR`：覆盖备份输出目录

脚本会先执行 WAL checkpoint，再通过 `VACUUM INTO` 生成一致性备份文件。

## 2. 恢复

本地恢复建议步骤：

```bash
cp storage/backups/open-interview-20260402T154500Z.sqlite storage/open-interview.sqlite
corepack pnpm db:init
```

如果你当前使用的是自定义数据库路径，请把备份文件复制到 `OPEN_INTERVIEW_DB_PATH` 或 `DATABASE_URL` 指向的位置，再执行 `corepack pnpm db:init`。

## 3. Restore Check

恢复完成后，至少执行以下检查：

```bash
corepack pnpm build
corepack pnpm dev
```

然后在另一个终端验证：

```bash
curl http://127.0.0.1:3000/api/health
```

若服务可用，再人工回归：

- `http://127.0.0.1:3000/import`
- `http://127.0.0.1:3000/questions`
- `http://127.0.0.1:3000/qa`

## 4. 题库导出

导出 canonical question bank：

```bash
corepack pnpm export:question-bank
```

默认输出目录：

```text
storage/exports/question-bank-<timestamp>.json
```

可选环境变量：

- `OPEN_INTERVIEW_EXPORT_DIR`：覆盖导出目录

导出 JSON 当前包含：

- 题目基础信息：`id`、`question_text`、`canonical_answer`、`category`、`difficulty`
- 状态与计数：`review_status`、`source_count`
- 标签与补充答案：`tags`、`supplemental_answers`
- 来源摘要：`sources`
- 面经沉淀关联摘要：`linked_interview_questions`

首轮导出不覆盖 QA session、practice history 与 resume 全量域。
