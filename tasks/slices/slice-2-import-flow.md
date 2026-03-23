# Slice 2 — Import Flow

- task_id: oi-slice-2-import-flow
- owner: execution
- status: pending
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
- [ ] user can create a source from pasted text
- [ ] user can create a manual Q&A item
- [ ] recent source list is visible on `/import`
- [ ] there is a clear handoff toward parse/review flow

## Refs
- `docs/ui-flows.md`
- `docs/api-schema.md`
- `docs/data-model.md`
