# Slice 7E — 长文档 Chunking / Merge

- task_id: oi-slice-7e-long-document-chunking
- owner: execution
- status: done
- completed_at: 2026-03-26T00:39:00+08:00
- reviewer_verdict: PASS_WITH_NOTES
- execution_completed_at: 2026-03-25T21:25:30+08:00
- priority: high
- goal: 在 7A~7D 已验收基线之上，为超长 `raw_text` / 长 PDF / 长 DOCX 的解析路径补齐最小可用的 chunking + merge，让长文档仍能进入现有 `source_document -> parse_job -> review -> confirm -> canonical` 主链，而不是因单次调用过长而失败或明显退化。

## Scope
- 为 `extract_interview` 增加长度阈值判断
- 超过阈值时，把 `raw_text` 按稳定规则切成多个 chunk
- 每个 chunk 继续复用现有 LLM parse path 产出局部候选
- 服务端对局部候选做最小 merge / dedupe，最终仍输出单个 `parseResultSchema`
- 为长文档 happy path 补齐最小 smoke proof

## Out of scope
- retry / repair JSON
- telemetry / metrics / tracing
- OCR
- taxonomy / language normalization 优化
- confirm / canonical import 语义变更
- resume parse 深度升级
- 前端大改

## Constraints
- preserve the existing `source_document -> parse_job -> review -> confirm -> canonical` mainline
- do not weaken or bypass review gate
- chunking 只在超过阈值时触发；中短文档继续保留单次调用路径
- 最终产物必须继续严格落到 `parseResultSchema`
- merge / dedupe 必须是 bounded、可解释、可 smoke 的最小实现；不要扩成复杂检索/聚类系统
- 不顺手把 7E 扩成 retry / telemetry 大包
- treat current worktree as 7A+7B+7C+7D accepted dirty baseline

## Done when
- [x] 长文档 parse path 具备阈值判断与 chunking 分支
- [x] 至少 1 个长文档样本通过 chunking path 到达 `needs_review`
- [x] 中短文档主路径不回退
- [x] merge 后结果仍满足 `parseResultSchema`
- [x] confirm 前 canonical tables 仍保持不变
- [x] validation + bounded smoke pass
- [x] reviewer-ready execution handoff is produced

## Acceptance notes
- 7E 这一刀只做 chunking / merge，不做 retry / telemetry；那两项如有必要，后续再拆独立 slice。
- merge 策略优先选 deterministic 规则（如 normalized question text 去重），不要引入难验证的复杂启发式。
- 若现有长文档样本不足，可先构造最小可复现样本或通过重复拼接形成长输入，但要明确说明。
- 只要证明长文档不再被单次调用长度卡死，且 review gate / canonical safety 不变，本 slice 就可视为通过。
- 2026-03-25 21:25 execution 已完成 7E：`parse-source.ts` 新增长文档阈值判断、稳定 chunking 与 chunk-level 结果 merge/dedupe；并新增 `scripts/smoke-7e-long-document.mjs` 作为 reviewer-ready smoke harness。
- execution 声明的关键参数是：`extract_interview` 超过 `24000` chars 时进入 chunking，目标 chunk 大小约 `18000` chars，最多 `8` chunks；超过上限将显式报 `chunk_limit_exceeded`，不做静默截断。
- execution smoke 证据为：生成的长 markdown 样本（`41083` chars）触发 `3` 次 chunk-level LLM 调用并最终到达 `needs_review`；短样本保持单次调用；confirm 前 canonical tables 仍为 `0 / 0 / 0`。
- 当前已进入 reviewer gate：需要重点判断 chunk boundary 策略、metadata merge 规则，以及显式 `8`-chunk bound 是否符合 MVP 边界；另需注意 execution smoke 使用 deterministic mocked model transport，而不是 live provider round-trip。
- 2026-03-26 00:39 reviewer verdict：`PASS_WITH_NOTES`。
- Reviewer 独立复核确认：chunking 只在 `rawText.length > 24000` 时触发；`24000` chars 仍保持单次路径，`24001` chars 进入 2-chunk 路径；超过 `8` chunks 的超大样本会以 `chunk_limit_exceeded` 清晰失败，而不是静默截断。
- Reviewer 独立重跑了 `corepack pnpm typecheck` / `corepack pnpm lint` / `corepack pnpm build --webpack`，并复现 execution 提供的 `scripts/smoke-7e-long-document.mjs`；同时补做 threshold boundary 与 over-bound smoke，确认 long-path / short-path / fail-fast boundedness / canonical safety 都成立。
- Non-blocking notes：长文档 smoke 主要是 mocked model transport，不是 live provider 多 chunk round-trip；此外 chunk warning 聚合经过 `normalizeStringList(..., 12)` 上限裁剪，在接近上限时可能丢失部分 chunk-level warnings。这两点都不构成 7E blocker，更适合作为后续 7F（retry / telemetry / ops hardening）候选范围。
- Hygiene note：7E 作为 bounded slice 已验收通过；AT-V1-013 的 Phase 2 P0 目标已闭环完成。若后续仍想增强运行时稳健性，应把 retry / telemetry / provider timeout observability 另切 7F，而不是回头把 7E 返工成更大的包。

## Refs
- `tasks/plans/upload-llm-import-plan.md`
- `src/server/adapters/openclaw/parse-source.ts`
- `src/server/adapters/openclaw/llm-client.ts`
- `src/server/services/parse-review-service.ts`
- `src/server/services/import-service.ts`
- `src/server/services/file-text-extraction-service.ts`
- `tasks/slices/slice-7c-llm-parse-adapter.md`
- `tasks/slices/slice-7d-pdf-docx-text-extraction.md`
