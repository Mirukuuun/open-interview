# Server Structure

Slice 0 keeps server code intentionally thin. Route handlers should stay close to
the HTTP boundary and delegate to `src/server/*` modules as business logic is
added in later slices.

Planned structure:

- `adapters/openclaw/`: provider boundary
- `db/schema/`: Drizzle schema
- `db/migrations/`: generated migrations
- `repositories/`: persistence access
- `services/`: business workflows
- `jobs/`: lightweight local worker orchestration
- `search/`: FTS and browse helpers
- `retrieval/`: grounded QA retrieval logic
