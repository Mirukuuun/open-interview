# Slice 3 — Parse Review Flow

- task_id: oi-slice-3-parse-review
- owner: execution
- status: pending
- priority: high
- goal: implement parse job lifecycle, review queue, and human confirmation before canonical write

## Scope
- create parse job endpoints and status flow
- implement `/review` and `/review/:jobId`
- persist parse result payloads for review
- support confirm/create/merge/skip decisions into canonical entities

## Out of scope
- final polished provider prompt quality
- advanced dedupe heuristics beyond a sensible MVP baseline
- fully automated conflict resolution

## Constraints
- parsed output must land in review first
- follow `docs/data-model.md` parse/result semantics
- reviewability is higher priority than automation sophistication

## Done when
- [ ] parse job can be created and polled
- [ ] review queue is operationally visible
- [ ] reviewer can inspect parse result and confirm selected items
- [ ] canonical question data is only written through confirmation flow

## Refs
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
