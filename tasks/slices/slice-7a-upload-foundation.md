# Slice 7A — Upload Foundation

- task_id: oi-slice-7a-upload-foundation
- owner: execution
- status: done
- completed_at: 2026-03-25T18:50:00+08:00
- reviewer_verdict: PASS_WITH_NOTES
- priority: high
- goal: make `/import` upload mode real for a first bounded slice by supporting single-file upload, local staging, txt/md extraction, and `source_document` creation with file metadata

## Scope
- replace the `/import` upload placeholder with a real single-file upload form
- add `POST /api/sources/upload` multipart endpoint
- save uploaded files into local project storage under a source-scoped path
- support `txt` / `md` text extraction in this slice
- create `source_document` with `file_name` / `mime_type` / `file_path` / `raw_text`
- return clear success / failure payloads for upload flow

## Out of scope
- pdf/docx extraction
- LLM parsing
- chunking / retry / telemetry
- bypassing review gate
- batch upload / object storage / OCR

## Constraints
- align with `tasks/plans/upload-llm-import-plan.md`
- preserve existing paste/manual import flows
- keep review/confirm chain semantics unchanged
- do not write canonical questions directly from upload API
- prefer thin route handlers + service layer extraction/storage helpers

## Done when
- [x] `/import` upload mode is no longer a placeholder and supports selecting a file plus required metadata
- [x] `POST /api/sources/upload` accepts multipart upload for `txt` / `md`
- [x] uploaded file is stored locally under `storage/raw/<source_id>/...`
- [x] successful upload creates a `source_document` with file metadata and extracted `raw_text`
- [x] unsupported file type / missing file / extraction failure return clear API errors
- [x] validation + minimal smoke pass
- [x] reviewer-ready execution handoff is produced

## Acceptance notes
- This slice intentionally stops before parse-job wiring and before LLM adapter work.
- If upload UI includes a future-facing `save_and_review` affordance, it must not fake a completed parse path in this slice.
- 2026-03-25 reviewer verdict: `PASS_WITH_NOTES`.
- Reviewer confirmed this slice stays严格停在 `source_document` 创建层：无 parse-job auto-trigger、无 LLM adapter 接线、无 review/confirm 语义漂移、无 canonical writes。
- Reviewer independently revalidated: `/import` upload tab live interaction、txt/md 正向上传、missing-file 400、unsupported-pdf 415、blank-text 422、recent sources file metadata 展示、paste/text route 回归、canonical/parse-job counters unchanged。
- Hygiene note：本 slice 的产品验收已通过；进入 7B 前只需保持 task/slice 文档状态同步，不需要对 7A 产品代码返工。

## Refs
- `tasks/plans/upload-llm-import-plan.md`
- `docs/ui-flows.md`
- `docs/api-schema.md`
- `src/features/import/import-actions-panel.tsx`
- `src/server/services/import-service.ts`
- `src/server/repositories/source-document-repository.ts`
