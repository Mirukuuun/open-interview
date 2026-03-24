# Slice 2 — Import Flow

- task_id: oi-slice-2-import-flow
- owner: execution
- status: done
- priority: high
- goal: make `/import` usable end-to-end for paste text, manual Q&A, and the source creation backbone

## Scope
- implement `/import`
- implement source creation APIs for pasted text and manual Q&A
- implement source listing / recent imports visibility
- add upload path if it fits cleanly in-scope

## Out of scope
- full parse review confirmation logic
- rich retrieval / QA
- fancy upload processing for every file type

## Constraints
- align with `docs/api-schema.md`
- page UX should follow `docs/ui-flows.md`
- prioritize an actually usable ingestion loop over broad file format support

## Done when
- [x] user can create a source from pasted text
- [x] user can create a manual Q&A item
- [x] recent source list is visible on `/import`
- [x] there is a clear handoff toward parse/review flow

## Acceptance notes
- 手工 reviewer 已完成真实链路抽查：`GET /import` 返回 200，`POST /api/sources/text` 返回 201，`POST /api/manual-qa` 返回 201，`GET /api/sources?page_size=5` 返回正确列表结果。
- 数据侧抽查确认：pasted text 写入 `source_documents` 且 `parse_status = not_started`；manual Q&A 会同时写入 `question_items` / `answer_variants` / confirmed `manual_input` source。
- `db:init` / `typecheck` / `lint` / `build` 全部通过。
- 已知非阻塞 note：build 存在 Turbopack/NFT tracing warning，链路指向 `src/server/db/paths.ts` 的动态路径解析；不阻塞 Slice 2 收口，但后续应在基础设施层消化。

## Refs
- `docs/ui-flows.md`
- `docs/api-schema.md`
- `docs/data-model.md`
