# Slice 4 — Browse / Search Workbench

- task_id: oi-slice-4-browse-search
- owner: execution
- status: in_progress
- priority: medium
- goal: make the question bank and interview notes truly browsable/searchable as the main daily-use surfaces

## Scope
- implement `/questions` + detail route
- implement `/interviews` + detail route
- implement list/search/filter APIs
- add SQLite FTS-backed keyword search where appropriate

## Out of scope
- AI answer generation
- advanced ranking experimentation
- Android client work

## Constraints
- dense, efficient workbench UX beats flashy visuals
- keep tables/lists highly scannable
- align with canonical route/page expectations in `docs/ui-flows.md`

## Done when
- [x] question bank list/detail works
- [x] interview notes list/detail works
- [x] keyword search and basic filters work
- [x] source/question cross-links are visible enough for study workflows

## Refs
- `docs/ui-flows.md`
- `docs/api-schema.md`
- `docs/data-model.md`
