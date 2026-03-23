# Slice 0 — Project Bootstrap

- task_id: oi-slice-0-bootstrap
- owner: execution
- status: pending
- priority: high
- goal: scaffold a runnable Open Interview web baseline aligned with canonical routes and stack decisions

## Scope
- initialize Next.js + TypeScript + Tailwind baseline
- prepare app shell with left navigation and top-level route placeholders
- prepare server/db folder structure for later slices
- make the repo runnable locally with clear scripts

## Out of scope
- real business data flows
- DB schema implementation beyond minimal setup wiring
- actual import/review/question features
- provider integration

## Constraints
- follow `docs/tech-stack.md`
- follow route map from `docs/ui-flows.md`
- keep route handlers thin or stubbed
- do not add auth or deployment-specific infra

## Expected outputs
- baseline app scaffold
- nav shell covering import/review/questions/interviews/qa/resume
- placeholder pages for canonical routes
- foundational folders under `src/features` and `src/server`
- README or run instructions sufficient for local startup

## Done when
- [ ] app installs and starts locally
- [ ] left nav and shell exist
- [ ] canonical top-level routes are present as placeholders
- [ ] repo structure matches future slice needs
- [ ] no fake business logic is baked into bootstrap

## Refs
- `docs/tech-stack.md`
- `docs/ui-flows.md`
- `docs/team-execution-plan.md`

## Review checklist
- Is the scaffold clean rather than over-engineered?
- Are routes and folders future-slice-friendly?
- Is styling utility-focused rather than flashy?
