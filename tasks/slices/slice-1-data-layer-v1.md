# Slice 1 — Data Layer v1

- task_id: oi-slice-1-data-layer
- owner: execution
- status: done
- priority: high
- goal: implement the first durable schema and local DB bootstrap path for core MVP entities

## Scope
- set up Drizzle schema + migration/bootstrap flow
- implement core tables for source, parse job, question, answer variant, interview, tag mappings
- include fields needed for current MVP contracts
- prepare a minimal DB access layer usable by API routes and worker code

## Out of scope
- full retrieval pipeline execution
- polished seeds/demo content beyond what is needed for bootstrap
- complete resume/deep-dive feature tables unless required by current docs as placeholders

## Constraints
- align with `docs/data-model.md`
- keep schema minimal but extensible
- use SQLite-compatible design
- do not introduce external DB or vector infra

## Done when
- [x] schema files exist and are organized
- [x] migration/bootstrap path works locally
- [x] core entities can be created by later slices without schema rework
- [x] FTS/retrieval-related tables are either present or intentionally staged with clear notes

## Refs
- `docs/tech-stack.md`
- `docs/data-model.md`
- `docs/api-schema.md`
