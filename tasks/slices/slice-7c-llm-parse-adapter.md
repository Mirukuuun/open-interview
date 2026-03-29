# Slice 7C — LLM Parse Adapter（Interview 主路径）

- task_id: oi-slice-7c-llm-parse-adapter
- owner: execution
- status: done
- completed_at: 2026-03-25T20:00:00+08:00
- reviewer_verdict: PASS_WITH_NOTES
- priority: high
- goal: 用真正的 LLM-backed parse adapter 替换当前 `extract_interview` 主路径上的 heuristic parser，同时继续复用现有 `parse_job -> review -> confirm` 链路并严格保留 review gate

## Scope
- 为 `extract_interview` 引入最小可用的服务端 LLM 解析路径
- 保持 provider boundary 在 `src/server/adapters/openclaw/` 一侧，不让前端直连模型
- 模型输出必须先经过严格结构化校验，再落到现有 `parse_job.result_json`
- 成功路径继续进入 `needs_review`
- 失败路径继续走现有 parse-job failed 语义，不污染 canonical
- 为 upload / paste 至少各覆盖一条可证明的模型解析 happy path 或最小共享主链证明

## Out of scope
- pdf/docx 文本抽取
- `extract_resume` 的深度升级
- confirm / canonical import 语义变更
- auto-import without review
- chunking / retry / telemetry hardening
- unrelated UI redesign

## Constraints
- preserve the existing `source_document -> parse_job -> review -> confirm -> canonical` mainline
- do not weaken or bypass review gate
- `extract_interview` 的主路径不能继续仅靠当前 heuristic parser 充当“已完成的 LLM 接入”
- 模型输出必须通过 `parseResultSchema`
- 若保留 heuristic fallback，必须把它视为 fallback / test aid，而不是伪装成 7C 的主实现
- 尽量复用已有 `parseReviewService.createParseJob(...)`、`openClawParseSourceAdapter.parse(...)` 调用面，避免把 7C 扩散成大重构
- 保持 7A / 7B 已通过的 upload、paste、review queue 语义不回退

## Done when
- [x] `extract_interview` parse job 不再只依赖当前 heuristic parser 主路径
- [x] 至少一个真实 parse job 通过新的 LLM-backed adapter 产出符合 `parseResultSchema` 的结果
- [x] happy path 仍停在 `needs_review`，不发生 silent canonical writes
- [x] LLM 不可用、返回非法 JSON、或 schema 校验失败时，能落到清晰的 parse failure 语义
- [x] 7A / 7B 既有 upload 与 review queue 行为不被带偏
- [x] validation + bounded smoke pass
- [x] reviewer-ready execution handoff is produced

## Acceptance notes
- 7C 的目标是“把 parse 质量主路径换成真正的模型调用”，不是继续堆 upload plumbing。
- 2026-03-25 19:40 的 execution closeout 先以 `blocked` 收口，原因仅是当时缺 live happy-path proof；并非代码实现缺失。
- 2026-03-25 19:52 main 已在 fresh production server `127.0.0.1:3138` + 临时 DB `/tmp/at-v1-013-7c-live.sqlite` 上补齐真实 provider smoke。
- 2026-03-25 20:00 reviewer verdict：`PASS_WITH_NOTES`。
- Reviewer 独立验证了两条路径：
  - real-provider happy path（显式关闭 heuristic fallback）可到达 `needs_review`
  - forced provider failure path 可稳定落到 `failed`
- Reviewer 确认 upload/review 主线与 7A / 7B 已验收语义没有漂移；confirm 前 canonical tables 仍无写入。
- Non-blocking notes：当前 LLM 输出的 category / tag / 语言归一化还不够收敛，但有 review gate 兜底，不构成 7C blocker；resume 仍走既有非-LLM 路线，符合本 slice 合同。
- Hygiene note：7C 已作为 bounded slice 验收通过，可直接进入 7D（pdf/docx 文本抽取），无需对 7C 做产品级返工。

## Refs
- `tasks/plans/upload-llm-import-plan.md`
- `src/server/adapters/openclaw/llm-client.ts`
- `src/server/adapters/openclaw/parse-source.ts`
- `src/server/services/parse-review-service.ts`
- `src/lib/schemas/parse-result.ts`
- `src/app/api/sources/upload/route.ts`
- `src/server/services/import-service.ts`
- `tasks/slices/slice-7b-upload-parse-review-wiring.md`
