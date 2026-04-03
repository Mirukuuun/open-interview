# Open Interview Tech Stack（agent-facing, v1）

- doc_type: tech_stack
- audience: agents / implementers
- status: active
- updated_at: 2026-04-02
- parent_doc: `docs/technical-design.md`
- canonical_for: implementation stack, repo layout, execution defaults, service boundaries

> 本文档是技术设计子文档，负责技术栈与实现边界；全局架构总览、最新框架图与 roadmap 见 `docs/technical-design.md`。

## 0. Product-to-implementation principles

- Build a **workbench**, not a generic chat app.
- Keep the MVP **single-repo, web-first**.
- Keep **SQLite as business source of truth** even when retrieval infra becomes more capable.
- Prefer **explicit, inspectable boundaries** over hidden magic.
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
- Default target: self-hosted web app, not Vercel-specific design

Self-host runtime contract:
- local development keeps using `corepack pnpm dev` on port `3000`
- the current server-side production app runs via `open-interview-mvp.service`
- the production Next.js listener port is `3106`
- `caddy.service` terminates TLS and proxies `career.mimiruku.cn` to `127.0.0.1:3106`

### 1.3 UI layer
- Tailwind CSS 4
- 自定义 workbench / UI primitives（`src/components/*`、`src/components/ui/*`）
- `clsx` + `tailwind-merge` 负责 class / variant 组合
- `@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono`
- Zod schema 负责 route boundary 与共享数据契约

当前仓库**没有**把 `shadcn/ui`、TanStack Query/Table、React Hook Form、Zustand 固化为 canonical 依赖；如后续引入，需要先更新本文档再视作正式栈。

### 1.4 Storage / data layer
- SQLite as the primary business database
- Drizzle ORM + drizzle-kit
- `better-sqlite3` driver
- SQLite FTS5 for lexical search / faceted retrieval support
- Milvus standalone as the primary vector retrieval backend for QA/RAG

Why Drizzle over Prisma for this MVP:
- better fit for SQLite-first business data model
- easier to mix typed schema with raw SQL/FTS needs
- lower friction for retrieval metadata / sync job tables
- better match for hybrid retrieval experiments where SQLite and Milvus coexist

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
- Vitest for unit / service / repository-level tests
- `typecheck` / `lint` / `build` 作为 repo-level validation baseline
- 面向关键页面与 API 的 lightweight smoke validation
- 浏览器 E2E / component 测试目前**不是**已固定的 canonical 栈；需要时再单独引入并补文档

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
      practice/
      qa/
      resume/
    prompts/
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
      vector/
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
- keep DB / service / adapter / vector-backend logic out of client components
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

### 4.2 MVP Hybrid RAG
Hybrid retrieval path:
1. query normalize + obvious metadata/filter pushdown
2. lexical candidate recall via SQLite FTS / structured filters
3. vector candidate recall via Milvus
4. lightweight app-side merge/rerank
5. answer generation with citations and retrieval trace

### 4.3 Embedding storage and vector backend
For MVP:
- SQLite remains the system of record for business entities, retrieval chunk metadata, sync state, logs, and citations
- Milvus is the canonical vector retrieval backend for QA/RAG
- vector documents should keep a stable `chunk_id` aligned with SQLite-side retrieval chunks
- only retrieval-relevant metadata should be copied into Milvus

Current local-dev config surface:
- LLM path and embedding path should be configured independently; embedding must not silently fall back to `LLM_*`
- `LLM_PROVIDER_NAME` selects one provider from `~/.openclaw/openclaw.json`; when omitted, LLM may still try configured providers in order
- `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_API` override the selected LLM provider transport
- `LLM_MODEL` / `LLM_MODEL_PARSE_INTERVIEW` / `LLM_MODEL_QA` control parse and QA model selection
- `MILVUS_ENABLED=1` enables the Milvus foundation path
- `MILVUS_BASE_URL` / `MILVUS_TOKEN` / `MILVUS_DB_NAME` / `MILVUS_COLLECTION_QA`
- `MILVUS_VECTOR_DIM` / `MILVUS_REQUEST_TIMEOUT_MS` / `MILVUS_SYNC_BATCH_SIZE`
- `EMBEDDING_PROVIDER_NAME` selects one provider from `~/.openclaw/openclaw.json` for vectorization only
- `EMBEDDING_BASE_URL` / `EMBEDDING_API_KEY` override the selected embedding provider transport
- `EMBEDDING_MODEL` (legacy alias: `EMBEDDING_MODEL_QA`) / `EMBEDDING_TIMEOUT_MS` / `EMBEDDING_DIMENSIONS`

Recommended deployment stance:
- start with **Milvus standalone / self-hosted**
- do not require hosted vector SaaS in MVP
- do not jump directly to distributed Milvus cluster operations
- Milvus standalone compose services should use `restart: unless-stopped`, so transient etcd / host jitter does not leave the vector backend permanently offline
- when `vector_backend.status` is `pending`, use the repo-local sync path `corepack pnpm vector:sync:qa:drain` under the same `MILVUS_*` / `EMBEDDING_*` env as the target runtime to drain backlog back to `ok`; keep batch size aligned with the runtime-safe value (current production baseline is `8`) instead of blindly raising it

Low-resource development fallback may exist temporarily, but it is **not** the canonical production path.

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
- distributed Milvus cluster operations
- hosted vector SaaS dependency
- event bus / microservice split
- agent-to-agent orchestration inside product runtime
- chat-first shell as the main product metaphor

Avoid:
- route handlers containing business logic
- direct provider calls from React components
- undocumented schema drift from canonical docs
- broad refactors during a narrow slice
- treating Milvus as the business source of truth

---

## 7. Codex execution defaults

Default implementation mode for bounded build slices:
- run Codex from repo root
- use full-permission mode for bounded implementation tasks when needed
- keep one meaningful slice per run
- require a short change report and known-risk summary after each run
- treat deployment as part of the coding loop for this repo: after tests and acceptance finish, `commit` and `push` the current branch before running `corepack pnpm deploy:mvp`
- `deploy:mvp` is the canonical server deploy path: `db:init -> build -> restart open-interview-mvp.service -> reload caddy.service -> smoke`

Codex should always read first:
- `docs/tech-stack.md`
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
- the relevant `tasks/slices/*.md`

---

## 8. Current delivery status

### 8.1 已落地里程碑
1. Slice 0 ~ 6 已落地：项目骨架、数据层、import、parse review、question bank / interviews、初版 QA、resume / deep dive。
2. QA 2.0 相关的 9B / 9C / 9D / 9A 已在当前仓库主干落地：Milvus foundation、hybrid retrieval、grounded answer / rewrite、chat-style workbench shell 均已存在。
3. 后续已继续落地多轮 follow-up：practice exams + profile、interview-question 解耦与 promote / merge、prompt markdown 化与中文化、interview detail source QA 折叠、若干 workbench polish。

### 8.2 当前 focus
- 保持 canonical docs 与已交付行为同步
- 在 bounded slice 模式下继续做 retrieval quality / practice / polish 迭代
- 把部署、健康检查、验证与 task closeout 继续固化成稳定工作流
