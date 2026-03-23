# Slice 5 — Lightweight RAG QA

- task_id: oi-slice-5-rag-qa
- owner: execution
- status: pending
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
- [ ] user can ask a question against local data
- [ ] answer includes citations
- [ ] retrieval hit/trace data is inspectable
- [ ] sessions are persisted for later review

## Refs
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
- `docs/tech-stack.md`
