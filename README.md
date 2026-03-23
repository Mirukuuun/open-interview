# Open Interview

Open Interview is a local-first workbench for importing interview notes, reviewing parsed candidates, building a canonical question bank, and running grounded AI review workflows.

This repository currently contains the Slice 0 bootstrap:

- Next.js App Router + TypeScript + Tailwind baseline
- workbench shell with left navigation and top bar
- canonical route placeholders for import, review, questions, interviews, QA, and resume flows
- future-facing `src/features` and `src/server` structure for later slices
- a stubbed `/api/health` route

## Requirements

- Node.js 22+
- `corepack pnpm` (pnpm is managed through Corepack in this repo)

## Run locally

1. Install dependencies:

```bash
corepack pnpm install
```

2. Start the development server:

```bash
corepack pnpm dev
```

3. Open the app:

```text
http://localhost:3000
```

The root route redirects to `/import` for the empty-product bootstrap state.

## Useful scripts

```bash
corepack pnpm build
corepack pnpm lint
corepack pnpm typecheck
```

## Slice 0 boundaries

What is intentionally present:

- scaffolded UI shell and route placeholders
- static empty states aligned to the canonical docs
- thin server stub for health/status

What is intentionally deferred:

- persistence and database schema
- import, parse, review, search, and QA business logic
- auth, deployment infrastructure, and provider wiring
