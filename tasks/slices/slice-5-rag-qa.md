# Slice 5 — Lightweight RAG QA

- task_id: oi-slice-5-rag-qa
- owner: execution
- status: in_progress
- priority: medium
- goal: add grounded QA on top of the existing bank with citations and retrieval trace visibility

## Scope
- implement `/qa` and session detail route
- implement lightweight hybrid retrieval path
- store retrieval logs and answer sessions
- show citations and related items in UI

## Out of scope
- external vector DB
- heavy reranker infra
- elaborate chat persona features

## Constraints
- align with RAG-related entities in `docs/data-model.md`
- citations are mandatory
- retrieval strategy/debug visibility should exist at least in a developer-facing panel

## Done when
- [x] user can ask a question against local data
- [x] answer includes citations
- [x] retrieval hit/trace data is inspectable
- [x] sessions are persisted for later review

## Execution notes
- implementation complete; reviewer verdict is `PASS_WITH_NOTES`
- validation completed with `db:init`, `typecheck`, `lint`, and `build --webpack`
- real local HTTP smoke passed on `next start` (`127.0.0.1:3102` / reviewer rerun on `127.0.0.1:3103`): create session, ask question, load `/qa`, load `/qa/:sessionId`, and inspect citations + retrieval trace
- negative-path check passed: unsupported nonsense query returns `409 retrieval_unavailable` instead of fabricating an answer

## Refs
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
- `docs/tech-stack.md`
