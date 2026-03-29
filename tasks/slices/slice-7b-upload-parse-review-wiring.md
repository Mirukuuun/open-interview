# Slice 7B — Upload Parse / Review Wiring

- task_id: oi-slice-7b-upload-parse-review-wiring
- owner: execution
- status: done
- completed_at: 2026-03-25T19:13:00+08:00
- reviewer_verdict: PASS
- priority: high
- goal: wire uploaded `source_document` into the existing parse-job + review queue path while preserving the human review gate and avoiding canonical writes

## Scope
- make uploaded sources able to create an `extract_interview` parse job through the existing parse-review service
- expose a clear upload-to-parse handoff in the UI / API flow
- ensure uploaded sources can become visible in the existing `/review` queue after parse execution
- keep `needs_review` as the terminal state for this slice’s happy path
- add bounded proof for `upload -> parse job -> review visibility`

## Out of scope
- replacing heuristic parser with a true LLM adapter
- pdf/docx extraction
- canonical confirmation/import changes
- auto-import without review
- chunking / retry / telemetry hardening

## Constraints
- preserve the existing `source_document -> parse_job -> review -> confirm -> canonical` mainline
- do not introduce silent canonical writes
- do not bypass `parseReviewService.createParseJob(...)`
- keep manual/paste flows working
- this slice may prove wiring with the current parser behavior; parser-quality upgrade belongs to later slice 7C

## Done when
- [x] at least one uploaded source can create a parse job through the normal service path
- [x] resulting parse job reaches review-visible state (`needs_review` on happy path)
- [x] `/review` can surface the uploaded-source parse result for inspection
- [x] upload-related UI/API makes the next step to parse/review clear
- [x] canonical tables remain unchanged before user confirmation
- [x] validation + bounded smoke pass
- [x] reviewer-ready execution handoff is produced

## Acceptance notes
- This slice is about plumbing and review visibility, not model-quality improvement.
- If current parser output quality is weak, that is only a blocker if it prevents the parse-job/review pipeline from being exercised at all; quality uplift belongs to 7C.
- Any new affordance should make the review gate more explicit, not less.
- 2026-03-25 reviewer verdict: `PASS`.
- Reviewer independently确认：`save_only` / `save_and_review` 两条上传路径都正常，paste flow 最小回归正常；`submitUploadedSource(...)` 通过 `parseReviewService.createParseJob(...)` 接入主链，未绕过 service layer。
- Reviewer 独立在 fresh production server `127.0.0.1:3136` 上验证：upload UI 已明确展示 parse/review 下一步与 review gate；`save_and_review` 返回 `next_step.kind = open_review` 且指向具体 job；uploaded parse job 出现在 `/api/parse-jobs` 与 `/review` 共用的 review queue 路径；confirm 前 canonical tables 无增量。
- Hygiene note：7B 已作为 bounded slice 验收通过，可直接进入 7C；无需对 7B 做产品级返工。

## Refs
- `tasks/plans/upload-llm-import-plan.md`
- `docs/ui-flows.md`
- `docs/api-schema.md`
- `src/server/services/parse-review-service.ts`
- `src/server/adapters/openclaw/parse-source.ts`
- `src/features/import/import-actions-panel.tsx`
- `src/app/api/sources/upload/route.ts`
