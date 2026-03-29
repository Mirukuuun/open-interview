# Slice 7D — PDF / DOCX 文本抽取

- task_id: oi-slice-7d-pdf-docx-text-extraction
- owner: execution
- status: done
- completed_at: 2026-03-25T20:57:00+08:00
- acceptance_owner: main
- acceptance_verdict: PASS
- priority: high
- goal: 在已验收的 7A/7B/7C 基线之上，为上传链路补齐 `pdf` / `docx` 文本抽取，让文件上传继续复用既有 `source_document -> parse_job -> review -> confirm -> canonical` 主链

## Scope
- 扩展 upload 支持的文件类型到 `pdf` / `docx`
- 为 `pdf` / `docx` 增加服务端文本抽取实现
- 保持抽取结果继续写入 `source_document.raw_text`
- 让 `save_only` 与 `save_and_review` 在 `pdf` / `docx` 上都能工作
- 为两种文件类型补齐最小 happy-path / failure-path smoke

## Out of scope
- OCR
- 扫描版 / 图片型 PDF 的识别增强
- chunking / map-reduce
- retry / telemetry hardening
- confirm / canonical import 语义变更
- taxonomy / language normalization 优化
- resume parse 深度升级

## Constraints
- preserve the existing `source_document -> parse_job -> review -> confirm -> canonical` mainline
- do not weaken or bypass review gate
- 不要因为支持 `pdf` / `docx` 就改写 7B / 7C 已验收的上传响应 contract
- `save_and_review` 必须继续复用既有 `parseReviewService.createParseJob(...)`
- 抽不出文本时要明确失败，不要伪造空文本成功
- 不做 OCR fallback；对无可读文本的 PDF / DOCX 应走清晰错误语义
- 以当前 7A+7B+7C accepted dirty baseline 为底继续叠加，不回退已有能力

## Done when
- [x] 上传接口可接受 `pdf` / `docx`
- [x] `pdf` / `docx` 均能抽出可读文本并创建带文件元数据的 `source_document`
- [x] 至少 1 个 `pdf` happy path 可通过 `save_and_review` 到达 `needs_review`
- [x] 至少 1 个 `docx` happy path 可通过 `save_and_review` 到达 `needs_review`
- [x] 至少 1 个无可读文本或损坏样本会返回清晰 extraction failure，不污染 canonical
- [x] confirm 前 canonical tables 仍保持不变
- [x] validation + bounded smoke pass
- [x] reviewer-ready execution handoff is produced

## Acceptance notes
- 7D 的目标是“补文件抽取”，不是继续改 parser prompt / taxonomy / canonical import。
- 若某个库选择需要新增依赖，优先选最小、稳定、维护正常的方案；不要引入重量级或浏览器端依赖。
- 对 image-only PDF，不要求 OCR；只要错误语义清晰即可。
- 若 `pdf` 与 `docx` 的 happy path 都已证明能沿 7C 现有主链进入 `needs_review`，则本 slice 可视为通过。
- 7C reviewer 提到的 category/tag/language 归一化问题，记为后续独立优化项，不要在 7D 顺手扩 scope。
- 2026-03-25 20:20 execution 已完成 7D：`file-storage-service` 放开 `.pdf/.docx`，`file-text-extraction-service` 新增 bounded DOCX OOXML 抽取与 bounded PDF content-stream 抽取，`import-actions-panel` 同步支持新文件类型与文案。
- 2026-03-25 20:37 main 已把 7D 推进到 reviewer gate，但 reviewer 会话在审阅中命中 `stream_read_error`，导致正式 reviewer completion 未及时返回；这不影响 execution artifact 完整性。
- 2026-03-25 20:57 main 进行了独立 bounded acceptance（不再等待 reviewer 会话恢复）：基于 compiled upload route `routeModule.userland.POST` + temp DB `/tmp/oi-7d-main-review.sqlite`，独立复核出：
  - PDF happy path：HTTP 201，`source_document.parse_status = needs_review`，`parse_job.status = needs_review`，`result_json IS NOT NULL`
  - DOCX happy path：HTTP 201，`source_document.parse_status = needs_review`，`parse_job.status = needs_review`，`result_json IS NOT NULL`
  - blank PDF failure path：HTTP 422，`error.code = text_extraction_failed`
  - canonical safety：`question_items / answer_variants / source_question_refs = 0 / 0 / 0`
- 基于 execution 证据 + main 独立 smoke，7D 作为 bounded slice 通过；无需继续等待 reviewer 才能进入下一刀。

## Refs
- `tasks/plans/upload-llm-import-plan.md`
- `src/server/services/file-storage-service.ts`
- `src/server/services/file-text-extraction-service.ts`
- `src/app/api/sources/upload/route.ts`
- `src/server/services/import-service.ts`
- `src/server/services/parse-review-service.ts`
- `src/server/adapters/openclaw/parse-source.ts`
- `tasks/slices/slice-7c-llm-parse-adapter.md`
