# Open Interview Tasks

This directory contains agent-facing execution artifacts and historical trace records.

## Directory layout
- `./slices/`：bounded implementation slices
- `./plans/`：phase plans / execution plans / topic plans
- `./retrospectives/`：retrospective records
- `./templates/`：execution templates such as Codex prompts

## Rules
- Product code must be authored by Codex CLI, not by agents directly.
- Task artifacts should map back to canonical project / technical docs (`../README.md`, `../docs/technical-design.md`, and child docs in `../docs/`).
- Each slice file should define goal, scope, constraints, done-when, refs, and review checklist.
- `tasks/` stores process trace; canonical system design belongs in `docs/`.
