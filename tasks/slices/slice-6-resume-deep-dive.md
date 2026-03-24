# Slice 6 — Resume / Project Deep Dive

- task_id: oi-slice-6-resume-deep-dive
- owner: execution
- status: in_progress
- priority: medium
- goal: add resume ingestion and project-centric deep-dive sessions as the first resume/work-experience interview surface

## Scope
- resume source ingestion path
- resume/project entity persistence
- `/resume` and project detail routes
- project deep-dive session flow

## Out of scope
- flashy mock interviewer avatars
- complex grading/report cards
- full behavioral interview simulation system

## Constraints
- preserve structured project entities
- prioritize project list/detail + deep-dive usability
- follow canonical product framing from existing docs

## Done when
- [x] resume can enter the system as a source
- [x] projects can be viewed as structured entities
- [x] a project deep-dive session can be created and reviewed

## Execution notes
- implementation complete; reviewer verdict is `PASS_WITH_NOTES`
- execution validation passed with `db:init`, `typecheck`, `lint`, and `build --webpack`
- real local HTTP smoke covered resume source ingestion, resume import from parsed source, `/resume`, project detail, and deep-dive session create/ask flow
- blocker rework fixed plain-title project splitting in `parse-source.ts`; multi-project resume samples now split into multiple structured `resume_projects` and persist correctly
- non-blocking note: `tech_stack` 仍有轻微 heuristic 误判风险（例如 `TypeScript` 可能因宽匹配被多带一个），但不再破坏 project splitting 或主链正确性
- scope remained bounded to structured resume/project persistence and the resume deep-dive surface; no auth, external vector infra, grading system, or flashy mock interviewer features were added

## Refs
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
