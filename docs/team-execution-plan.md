# Open Interview Team Execution Plan（agent-facing, v0）

- doc_type: execution_plan
- audience: agents / implementers
- status: in_progress
- updated_at: 2026-03-24
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
- monitor Codex execution via the execution role
- synthesize review findings
- communicate with Miruku

### Execution role
Responsibilities:
- prepare the bounded Codex run
- launch Codex CLI in the project workdir
- stay responsible until the Codex run exits
- collect changed files, validation results, blockers, and next handoff notes
- hand a complete execution summary to reviewer + lead

Execution closure rule:
- execution is **not complete when Codex starts**
- execution is complete only after Codex has exited and a bounded handoff includes:
  - command shape / run context
  - changed files or changed areas
  - validation results (`install`, `typecheck`, `lint`, `build`, or justified subset)
  - known blockers / risks
  - explicit reviewer focus points
- the lead should not need to manually poll raw process state to know whether a slice finished

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
Status: done
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
Status: done
Goal:
- create DB schema for source / parse_job / question / answer_variant / interview / tag mappings
- prepare migration/bootstrap path

Done when:
- schema exists
- local DB can initialize
- seed/dev bootstrap path is available

### Slice 2 — Import flow
Status: done
Goal:
- implement `/import`
- support paste text / manual QA / upload entry points
- persist sources

Done when:
- source creation works end-to-end
- recent import list visible

### Slice 3 — Parse review flow
Status: done
Goal:
- implement parse job creation/status flow
- implement `/review` and `/review/:jobId`
- support batch create/merge/skip decisions

Done when:
- parse result can be reviewed and confirmed into canonical data

### Slice 4 — Question bank / interview views
Status: done
Goal:
- implement `/questions` + detail
- implement `/interviews` + detail
- add FTS search/filter

Done when:
- core browse/search loop is usable

### Slice 5 — Lightweight RAG QA
Status: done
Goal:
- implement chunking / retrieval / citations
- implement `/qa`

Done when:
- grounded answers with citations work on local data

### Slice 6 — Resume / deep dive
Status: done
Goal:
- implement resume parse flow and project deep-dive routes

Done when:
- project deep-dive session is usable

## 5. Immediate next action

Next recommended action:
- commit/push Slice 6 close-out on `dev/mvp-delivery`
- then decide the next post-MVP slice / hardening target（例如 parser-focused tests、tech-stack heuristic tightening、or broader planning）
- keep follow-up bounded; do not immediately expand into auth / external infra / grading systems

Reason:
- Slice 6 已完成实现、reviewer 复验与 blocker rework，MVP 的 resume / project deep-dive 主链已经收口。
- 当前最有价值的是先把通过验收的状态与代码正式落到远端，再决定下一阶段是做质量加固还是扩后续产品能力。

## 6. Review protocol

After each Codex run:
1. execution confirms the run has actually exited
2. execution collects changed files / changed areas
3. execution runs or reports validation (`install`, `typecheck`, `lint`, `build`, or justified subset)
4. reviewer inspects diff vs canonical docs
5. identify correctness gaps / drift
6. either accept or send bounded rework prompt back to Codex
7. update this plan / status

Escalation rule:
- if the execution handoff is incomplete, the slice is still considered `in_progress`
- do not treat “Codex launched” as a finished execution step

## 7. Status log

- 2026-03-23: Team mode started for Open Interview.
- 2026-03-23: Confirmed Codex CLI must be the only code-writing path.
- 2026-03-23: GitHub SSH push path fixed; branch `dev/mvp-delivery` pushed.
- 2026-03-23: Added canonical execution bridge docs: `docs/tech-stack.md`, `docs/codex-task-prompts.md`.
- 2026-03-23: Added bounded Codex slice docs under `tasks/slices/`.
- 2026-03-24: Slice 1（Data Layer v1）reviewer 通过，完成清理、提交并推送到 `dev/mvp-delivery`。
- 2026-03-24: Slice 2（Import flow）已切到 in_progress，进入 execution。
- 2026-03-24: Slice 2（Import flow）经手工 reviewer 收口通过：真实 HTTP 抽查完成，`/import`、`POST /api/sources/text`、`POST /api/manual-qa`、`GET /api/sources` 可用；`db:init` / `typecheck` / `lint` / `build` 全绿。Turbopack/NFT tracing warning 记为非阻塞 note，后续在基础设施层处理。
- 2026-03-24: Slice 3（Parse review flow）已切到 in_progress，进入 execution。
- 2026-03-24: Slice 3（Parse review flow）完成最小返工收口：`/review` blocker 已解除，`db:init` / `typecheck` / `lint` / `build` 全绿，真实 HTTP 抽查通过（`GET /review` -> 200，queue 可见；`POST /api/parse-jobs` -> 201；`GET /review/:jobId` -> 200）。
- 2026-03-24: Slice 3（Parse review flow）经 reviewer 正式验收通过（PASS_WITH_NOTES）：确认 `/review` queue 不再 500，`page_size` 上限防御生效，review -> confirm -> canonical 写入门控成立；非阻塞 note 为 `/review` 暂无分页控件、`next build` 仍有既知 Turbopack/NFT tracing warning。可进入 commit/push 收口。
- 2026-03-24: Slice 4（Question bank / interview views）已切到 in_progress，进入 execution；本轮目标是打通 `/questions`、`/questions/:questionId`、`/interviews`、`/interviews/:interviewId` 与基础搜索/过滤，不扩到 QA / resume / auth。
- 2026-03-24: Slice 4 首轮 Codex dispatch 已发出，但被 Codex CLI usage limit 阻塞；当前不是实现失败，而是执行额度问题。待 Codex 可用后，复用现成 bounded prompt 继续 execution。
- 2026-03-24: Slice 4（Question bank / interview views）完成实现并通过独立验证：`/questions`、`/questions/:questionId`、`/interviews`、`/interviews/:interviewId` 与最小 list/detail/search/filter API 可用；`db:init` / `typecheck` / `lint` / `build --webpack` 全绿，questions/interviews 的本地 HTTP smoke 通过。
- 2026-03-24: Slice 4 经 reviewer 正式验收通过（PASS_WITH_NOTES）：Question bank / interview browse loop 已达成合同范围；非阻塞 note 为当前未提供更宽泛的统一 `/api/search` 面，且 repo 状态文档需在 commit 前同步收口。
- 2026-03-24: Slice 5（Lightweight RAG QA）已切到 in_progress，进入 execution；本轮目标是打通 `/qa`、session/ask API、轻量 hybrid retrieval、citations 与 retrieval trace，不扩到 resume deep-dive / auth / 外部向量基础设施。
- 2026-03-24: Slice 5（Lightweight RAG QA）execution 完成：`/qa`、`/qa/:sessionId`、`POST /api/qa/sessions`、`POST /api/qa/sessions/:sessionId/ask`、`GET /api/qa/sessions/:sessionId`、`ai_sessions` / `session_turns` / `retrieval_logs` persistence、lightweight hybrid retrieval、citations、related questions、developer-facing retrieval trace 已打通。
- 2026-03-24: Slice 5 validation 通过：`db:init` / `typecheck` / `lint` / `build --webpack` 全绿。
- 2026-03-24: Slice 5 real local HTTP smoke 通过：`GET /qa` -> 200；`POST /api/qa/sessions` -> 201；`POST /api/qa/sessions/:sessionId/ask` -> 200；`GET /api/qa/sessions/:sessionId` -> 200；`GET /qa/:sessionId` -> 200，并确认 answer / citations / related questions / retrieval_log / retrieval trace 可见；negative-path 对无 grounding 的 nonsense query 返回 `409 retrieval_unavailable`。
- 2026-03-24: Slice 5 经 reviewer 正式验收通过（PASS_WITH_NOTES）：Lightweight RAG QA 已达成合同范围；非阻塞 note 为当前 citations 仍以 question-centric owner 为主、仅带 source/interview backref，这在本 slice 的最小合同内可接受。
- 2026-03-24: Slice 6（Resume / deep dive）已切到 in_progress，进入 execution；本轮目标是打通 resume source ingestion、structured project entities、`/resume`、project detail 与 deep-dive session 主链，不扩到 mock interviewer persona / grading system / auth / 外部基础设施。
- 2026-03-24: Slice 6（Resume / deep dive）execution 完成：resume source ingestion -> parse -> structured resume/project persistence、`/resume`、`/resume/:resumeId`、`/resume/projects/:projectId`、`/api/resumes/from-source`、`/api/resumes/:resumeId/projects`、`/api/resume-projects/:projectId`、deep-dive session create / ask 主链已打通，并复用 Slice 5 的 retrieval/session 基础能力但未扩成通用聊天壳。
- 2026-03-24: Slice 6 validation 通过：`db:init` / `typecheck` / `lint` / `build --webpack` 全绿。
- 2026-03-24: Slice 6 real local HTTP smoke 通过：`POST /api/sources/text`（resume）-> 201；`POST /api/parse-jobs`（`extract_resume`）-> 201 / `needs_review`；`POST /api/resumes/from-source` -> 201；`GET /resume` -> 200；`GET /resume/:resumeId` -> 200；`GET /resume/projects/:projectId` -> 200；`POST /api/resume-projects/:projectId/deep-dive-sessions` -> 201；`POST /api/resume-projects/:projectId/deep-dive-sessions/:sessionId/ask` -> 200；`GET /resume/projects/:projectId/session/:sessionId` -> 200。
- 2026-03-24: Slice 6 首轮 reviewer 复验 BLOCK：发现 `parse-source.ts` 在 Projects section 内会把相邻 plain project titles 合并成一个 `resume_project`，导致 structured project entities 不稳定；需做最小 parser rework 后再复验。
- 2026-03-24: Slice 6 blocker rework 完成：`parse-source.ts` 增补 plain-title boundary 判断，修复多 plain-title project 样本的 block splitting；多项目 parse result 与 `resume_projects` persistence 已通过真实 HTTP smoke 复验，且 Slice 5 QA sanity smoke 无明显回归。
- 2026-03-24: Slice 6 经 reviewer 最终复验通过（PASS_WITH_NOTES）：resume / project deep-dive 主链达成合同范围；非阻塞 note 为 `tech_stack` heuristic 仍可能有轻微误判，以及 repo 状态需在 commit 前收口。
