# Slice 6 — Resume / Project Deep Dive

- task_id: oi-slice-6-resume-deep-dive
- owner: execution
- status: pending
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
- [ ] resume can enter the system as a source
- [ ] projects can be viewed as structured entities
- [ ] a project deep-dive session can be created and reviewed

## Refs
- `docs/data-model.md`
- `docs/api-schema.md`
- `docs/ui-flows.md`
