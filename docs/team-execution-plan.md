# Open Interview Team Execution Plan（agent-facing, v0）

- doc_type: execution_plan
- audience: agents / implementers
- status: in_progress
- updated_at: 2026-03-23
- canonical_for: team operating mode, role boundaries, backlog slices, execution constraints

## 0. Hard constraints

- Product code must be written via **Codex CLI**.
- Agents must **not** directly author product code files for this project.
- Agents are allowed to:
  - design
  - define contracts
  - decompose tasks
  - review Codex output
  - verify behavior
  - raise ambiguity / issue confirmation requests
- If a task requires code changes, the execution path is:
  - Lead defines bounded task
  - Codex CLI performs implementation in project workdir
  - Reviewer checks output
  - Lead summarizes and decides next step

## 1. Team roles

### Lead (Mimi)
Responsibilities:
- maintain canonical docs
- freeze scope / boundaries
- decide next bounded coding slice
- prepare Codex prompts
- monitor Codex execution
- synthesize review findings
- communicate with Miruku

### Execution engine (Codex CLI)
Responsibilities:
- write product code
- create / modify project code files
- implement bounded prompts only
- report what changed

### Reviewer (Agent)
Responsibilities:
- inspect code produced by Codex
- compare implementation vs docs/contracts
- find defects / drift / missing edge cases
- request rework via new bounded Codex prompt when needed

## 2. Current canonical docs

- `docs/mvp-implementation-plan.md`
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
- `docs/team-execution-plan.md`

## 3. Build strategy

Principle:
- docs-first
- contract-first
- thin vertical slices
- UI + API + storage close in one repository
- review after every bounded Codex task

Working rule:
- prefer one meaningful slice at a time
- avoid “build the whole product” prompts
- every slice should have explicit done-when

## 4. Initial backlog slices

### Slice 0 — Project bootstrap
Status: pending
Goal:
- freeze technical stack
- scaffold repo structure
- create app shell
- ensure dev server starts

Done when:
- project has runnable baseline app
- routes scaffolded
- basic layout present

### Slice 1 — Data layer v1
Status: pending
Goal:
- create DB schema for source / parse_job / question / answer_variant / interview / tag mappings
- prepare migration/bootstrap path

Done when:
- schema exists
- local DB can initialize
- seed/dev bootstrap path is available

### Slice 2 — Import flow
Status: pending
Goal:
- implement `/import`
- support paste text / manual QA / upload entry points
- persist sources

Done when:
- source creation works end-to-end
- recent import list visible

### Slice 3 — Parse review flow
Status: pending
Goal:
- implement parse job creation/status flow
- implement `/review` and `/review/:jobId`
- support batch create/merge/skip decisions

Done when:
- parse result can be reviewed and confirmed into canonical data

### Slice 4 — Question bank / interview views
Status: pending
Goal:
- implement `/questions` + detail
- implement `/interviews` + detail
- add FTS search/filter

Done when:
- core browse/search loop is usable

### Slice 5 — Lightweight RAG QA
Status: pending
Goal:
- implement chunking / retrieval / citations
- implement `/qa`

Done when:
- grounded answers with citations work on local data

### Slice 6 — Resume / deep dive
Status: pending
Goal:
- implement resume parse flow and project deep-dive routes

Done when:
- project deep-dive session is usable

## 5. Immediate next action

Next recommended action:
- freeze `tech-stack.md`
- then generate `codex-task-prompts.md`
- then launch Codex for Slice 0

Reason:
- Codex performs better when stack/constraints are explicit.
- This project already has enough product/design docs; the missing bridge is execution prompts.

## 6. Review protocol

After each Codex run:
1. collect changed files
2. inspect diff vs canonical docs
3. identify correctness gaps / drift
4. either accept or send bounded rework prompt back to Codex
5. update this plan / status

## 7. Status log

- 2026-03-23: Team mode started for Open Interview.
- 2026-03-23: Confirmed Codex CLI must be the only code-writing path.
- 2026-03-23: GitHub SSH push path fixed; branch `dev/mvp-delivery` pushed.
- 2026-03-23: Added canonical execution bridge docs: `docs/tech-stack.md`, `docs/codex-task-prompts.md`.
- 2026-03-23: Added bounded Codex slice docs under `tasks/slices/`.
