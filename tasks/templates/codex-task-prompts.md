# Open Interview Codex Task Prompts（agent-facing, v1）

- doc_type: codex_prompts
- audience: lead / execution / reviewer
- status: active
- updated_at: 2026-03-27
- canonical_for: Codex prompt framing, per-slice execution prompts, reporting expectations

> 本文档位于 `tasks/templates/`，属于执行模板，不替代 `docs/technical-design.md` 及其技术子文档。

## 0. How to use this doc

This file is the bridge between canonical design docs and Codex execution.

Rules:
- use **one slice per Codex run** by default
- point Codex to the exact slice doc in `tasks/slices/`
- do not ask Codex to redesign the product
- do not ask Codex to “build the whole app”
- require a compact implementation report after every run

---

## 1. Global Codex instruction block

Use this block at the top of implementation prompts.

```text
You are implementing a bounded slice for the Open Interview MVP.

Read first:
- docs/technical-design.md
- docs/tech-stack.md
- docs/data-model.md
- docs/api-schema.md
- docs/ui-flows.md
- tasks/plans/team-execution-plan.md
- the specific task file I reference below

Hard constraints:
- Follow canonical docs. Do not invent alternate product direction.
- Keep changes tightly scoped to the requested slice.
- Prefer clear, maintainable code over clever abstractions.
- Keep route handlers thin; move logic into server/services.
- Validate API boundaries with Zod.
- Do not add auth, external infra, or unrelated refactors.
- If a contract is ambiguous, choose the most conservative implementation that preserves forward evolution.

When finished, report:
1. files changed
2. key implementation decisions
3. anything intentionally deferred
4. known risks / follow-up items
```

---

## 2. Prompt template

```text
[global instruction block above]

Implement task: <task file path>

Scope:
- <repeat the narrow goal in one paragraph>

Important refs:
- <doc refs>

Done when:
- <copy the task done-when bullets>

Output format:
- concise summary
- changed files list
- follow-up risks
```

---

## 3. Ready-to-run slice prompts

## 3.1 Slice 0 — project bootstrap

```text
You are implementing a bounded slice for the Open Interview MVP.

Read first:
- docs/technical-design.md
- docs/tech-stack.md
- docs/ui-flows.md
- tasks/plans/team-execution-plan.md
- tasks/slices/slice-0-project-bootstrap.md

Hard constraints:
- Follow canonical docs. Do not invent alternate product direction.
- Keep changes tightly scoped to the requested slice.
- Do not implement business features beyond bootstrap/app shell.
- Create a clean baseline that future slices can extend.
- Do not add auth or external infra.

Implement task: tasks/slices/slice-0-project-bootstrap.md

Focus:
- scaffold the Next.js + TypeScript + Tailwind app baseline
- set up shadcn/ui-ready structure
- establish app shell + left nav routes as placeholders
- establish server/db folder layout for future slices
- ensure local dev boot path is clear

When finished, report:
1. files changed
2. how to run locally
3. anything stubbed intentionally
4. risks / follow-up items for Slice 1
```

## 3.2 Slice 1 — data layer v1

```text
Use the global instruction block from tasks/templates/codex-task-prompts.md.

Implement task: tasks/slices/slice-1-data-layer-v1.md

Extra constraints:
- schema must align with docs/data-model.md
- prefer a minimal but extensible schema set
- include migration/bootstrap path
- do not start retrieval or embedding execution yet beyond schema placeholders if the task allows
```

## 3.3 Slice 2 — import flow

```text
Use the global instruction block from tasks/templates/codex-task-prompts.md.

Implement task: tasks/slices/slice-2-import-flow.md

Extra constraints:
- prioritize paste/manual flows first if file upload adds too much surface
- `/import` must feel usable even before parse/review is fully complete
- keep source creation and recent item visibility working end-to-end
```

## 3.4 Slice 3 — parse review flow

```text
Use the global instruction block from tasks/templates/codex-task-prompts.md.

Implement task: tasks/slices/slice-3-parse-review-flow.md

Extra constraints:
- reviewability is more important than automation polish
- parse output must not auto-write into canonical question storage without confirm
- include visible job status and retry-friendly structure
```

## 3.5 Slice 4 — question bank / interviews / search

```text
Use the global instruction block from tasks/templates/codex-task-prompts.md.

Implement task: tasks/slices/slice-4-browse-search.md

Extra constraints:
- optimize for dense, efficient browsing
- include search/filter primitives that can grow later
- do not over-style at the cost of utility
```

## 3.6 Slice 5 — lightweight RAG QA

```text
Use the global instruction block from tasks/templates/codex-task-prompts.md.

Implement task: tasks/slices/slice-5-rag-qa.md

Extra constraints:
- answer grounding and citations are mandatory
- retrieval trace/debug visibility should exist at least in a dev-facing panel
- do not introduce an external vector database
```

## 3.7 Slice 6 — resume / deep dive

```text
Use the global instruction block from tasks/templates/codex-task-prompts.md.

Implement task: tasks/slices/slice-6-resume-deep-dive.md

Extra constraints:
- focus on project list/detail + deep-dive session
- do not spend time on avatar/mock-interviewer theatrics
- preserve structured resume/project entities for later extension
```

---

## 4. Reviewer checklist after each Codex run

- Did the implementation stay within the slice boundary?
- Did it follow canonical docs instead of inventing new contracts?
- Are file boundaries reasonable?
- Are error/loading/empty states present for user-facing pages?
- Are there hidden shortcuts that will block the next slice?
- Is the diff small enough to review safely?

If the answer to any of these is “no”, send a bounded rework prompt instead of fixing by hand.
