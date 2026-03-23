# Open Interview Tech Stack（agent-facing, v1）

- doc_type: tech_stack
- audience: agents / implementers
- status: active
- updated_at: 2026-03-23
- canonical_for: implementation stack, repo layout, execution defaults, service boundaries

## 0. Product-to-implementation principles

- Build a **workbench**, not a generic chat app.
- Keep the MVP **single-repo, web-first, local-first**.
- Prefer **simple, inspectable infrastructure** over premature scale primitives.
- Keep **structured entities** as source of truth; retrieval is an enhancement layer.
- Optimize for **Codex-friendly delivery**: explicit files, stable boundaries, low hidden magic.

## 1. Frozen stack decisions

### 1.1 Runtime / package management
- Node.js 22+
- TypeScript
- `pnpm` as package manager

### 1.2 App framework
- Next.js (App Router)
- React
- Route handlers under `/api`
- Default target: local development first, not Vercel-specific design

### 1.3 UI layer
- Tailwind CSS
- `shadcn/ui`
- TanStack Table
- TanStack Query
- React Hook Form + Zod
- Zustand (only for local ephemeral UI state)

### 1.4 Storage / data layer
- SQLite as the primary database
- Drizzle ORM + drizzle-kit
- `better-sqlite3` driver
- SQLite FTS5 for search

Why Drizzle over Prisma for this MVP:
- better fit for SQLite-first local app
- easier to mix typed schema with raw SQL/FTS needs
- lower friction for custom retrieval tables and job tables
- better match for lightweight hybrid retrieval experiments

### 1.5 File storage
Local filesystem storage rooted at:
- `storage/raw/`
- `storage/parsed/`
- `storage/transcripts/`
- `storage/uploads/` (optional explicit upload staging)

### 1.6 AI / provider boundary
Use an **OpenClaw adapter layer** behind a server-only interface.

Adapter responsibilities:
- parse source text into `ParseResult`
- generate grounded QA answer from retrieved context
- generate embeddings (or delegate to configured provider)

Rules:
- no provider-specific logic in route handlers
- all provider I/O flows through `src/server/adapters/openclaw/`
- if a provider is temporarily unavailable, the app should degrade visibly, not silently fabricate data

### 1.7 Async execution model
Use a **DB-backed lightweight job model**, not an external queue service.

For MVP:
- job state persists in `parse_job` / later background-job tables
- execution is handled by a lightweight local worker process
- worker can be started separately from the web app

Initial goal:
- make async jobs inspectable and retryable
- avoid hidden in-request long-running work where possible

### 1.8 Testing
- Vitest for unit/service tests
- React Testing Library for component-level tests where useful
- lightweight smoke validation for MVP slices
- Playwright is optional later; not required to unblock early slices

---

## 2. Repo layout

Recommended layout:

```text
open-interview/
  docs/
  tasks/
    slices/
  storage/
    raw/
    parsed/
    transcripts/
  src/
    app/
      (routes + route handlers)
    components/
    features/
      import/
      review/
      questions/
      interviews/
      qa/
      resume/
    server/
      adapters/
        openclaw/
      db/
        schema/
        migrations/
      repositories/
      services/
      jobs/
      search/
      retrieval/
    lib/
      schemas/
      utils/
  scripts/
  tests/
  package.json
  pnpm-lock.yaml
```

Rules:
- keep feature UI code under `src/features/*`
- keep reusable primitives under `src/components/*`
- keep DB / service / adapter logic out of client components
- keep route handlers thin; push work into services

---

## 3. API and schema rules

- HTTP API base path: `/api`
- contracts must follow `docs/api-schema.md`
- entities and state transitions must follow `docs/data-model.md`
- all server input/output validation uses Zod at the boundary
- opaque IDs only; no semantic IDs in public API contracts

---

## 4. Search and retrieval strategy

### 4.1 MVP search
- exact-ish lookup on normalized fields
- SQLite FTS5 for keyword/full-text search
- faceted filtering by category/tag/source/kind/status

### 4.2 MVP lightweight RAG
Hybrid retrieval path:
1. lexical candidate recall via FTS / structured filters
2. optional embedding similarity recall from stored vectors
3. lightweight app-side merge/rerank
4. answer generation with citations and retrieval trace

### 4.3 Embedding storage
For MVP, embedding vectors may be stored in SQLite in a simple serialized form.
Do not introduce an external vector database in MVP.

---

## 5. Route and feature mapping

Main product surfaces:
- `/import`
- `/review`
- `/review/:jobId`
- `/questions`
- `/questions/:questionId`
- `/interviews`
- `/interviews/:interviewId`
- `/qa`
- `/qa/:sessionId`
- `/resume`
- `/resume/:resumeId`
- `/resume/projects/:projectId`
- `/resume/projects/:projectId/session/:sessionId`

These routes are canonical unless a later doc explicitly supersedes them.

---

## 6. Non-goals and anti-patterns

Do not add in MVP:
- auth/multi-user complexity
- external queue infra
- external vector DB
- event bus / microservice split
- agent-to-agent orchestration inside product runtime
- chat-first shell as the main product metaphor

Avoid:
- route handlers containing business logic
- direct provider calls from React components
- undocumented schema drift from canonical docs
- broad refactors during a narrow slice

---

## 7. Codex execution defaults

Default implementation mode for bounded build slices:
- run Codex from repo root
- use full-permission mode for bounded implementation tasks when needed
- keep one meaningful slice per run
- require a short change report and known-risk summary after each run

Codex should always read first:
- `docs/tech-stack.md`
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
- the relevant `tasks/slices/*.md`

---

## 8. Immediate implementation order

1. Slice 0 — project bootstrap
2. Slice 1 — data layer v1
3. Slice 2 — import flow
4. Slice 3 — parse review flow
5. Slice 4 — question bank / interview views
6. Slice 5 — lightweight RAG QA
7. Slice 6 — resume / deep dive
