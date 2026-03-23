# Open Interview UI Flows（agent-facing, v0）

- doc_type: ui_flows
- audience: agents / implementers
- status: draft
- updated_at: 2026-03-23
- canonical_for: route map, page states, component boundaries, UI data dependencies, interaction flows

## 0. Agent-facing rules

### UI philosophy
- Product is **workbench-first**, not chat-first.
- Primary value is: import -> parse -> review -> canonicalize -> search/review -> grounded AI.
- AI UI must expose grounding/citations; avoid “magic answer box” design.
- Review/confirm is a first-class workflow, not a secondary modal.
- Question Bank is the primary long-term usage surface.

### Implementation rules
- Prefer stable routes and reusable layout regions.
- Prefer stateful pages over deeply nested modal chains.
- Keep MVP desktop-first; Android can consume a reduced subset later.
- Use explicit empty/loading/error states; do not leave blank panels.
- If a page depends on async job state, show pollable status and retry actions.

### Non-goals for MVP UI
- avatar / voice / anthropomorphic interviewer UI
- complex animation
- visual mind-map / graph view
- drag-and-drop workflow builder
- “AI copilot” overlays everywhere

---

## 1. Global shell

## 1.1 App layout

```text
┌────────────────────────────────────────────────────────────┐
│ Top bar: project title | global search | theme | status   │
├───────────────┬────────────────────────────────────────────┤
│ Left nav      │ Main content area                         │
│               │                                            │
│ Import        │ Route-dependent page                       │
│ Review Queue  │                                            │
│ Question Bank │                                            │
│ Interviews    │                                            │
│ AI Review     │                                            │
│ Resume        │                                            │
└───────────────┴────────────────────────────────────────────┘
```

## 1.2 Left nav contract

Primary nav items:
- `Import`
- `Review Queue`
- `Question Bank`
- `Interview Notes`
- `AI Review`
- `Resume / Projects`

Optional utility nav later:
- `Settings`
- `Admin / Retrieval Debug`

Rules:
- `Review Queue` should show a badge count for `needs_review` if available.
- `Question Bank` is expected to be the default landing page after the system has data.
- Initial empty product can land on `Import`.

## 1.3 Top bar contract

Required elements:
- app title: `Open Interview`
- optional global search trigger
- current provider/system status indicator (optional in MVP)
- theme switch (optional in MVP)

Do not put business-critical actions only in the top bar.

---

## 2. Route map

Suggested routes:

```text
/
/import
/review
/review/:jobId
/questions
/questions/:questionId
/interviews
/interviews/:interviewId
/qa
/qa/:sessionId
/resume
/resume/:resumeId
/resume/projects/:projectId
/resume/projects/:projectId/session/:sessionId
```

Routing rules:
- Route params should be stable opaque IDs.
- List pages and detail pages should both work as direct-entry routes.
- Side drawer UX is allowed, but full route should still exist for reload/share/debug.

---

## 3. Page definitions

## 3.1 `/import`
Purpose:
- create raw inputs quickly
- show recent ingestion results
- bridge users into review flow

### Layout
Recommended 2-column layout:

```text
┌───────────────────────────┬───────────────────────────────┐
│ Left: import methods      │ Right: recent imports/jobs    │
│                           │                               │
│ [Upload] [Paste] [Manual] │ latest sources                │
│ active input panel        │ latest parse jobs             │
│                           │ quick links to review         │
└───────────────────────────┴───────────────────────────────┘
```

### Tabs / modes
- `Upload`
- `Paste Text`
- `Manual Q&A`

### Required interactions
#### Upload mode
Inputs:
- file
- kind
- optional title
- optional source_url

Actions:
- `Upload`
- after success: optional `Create Parse Job`

#### Paste Text mode
Inputs:
- title
- kind
- raw_text
- optional source_url

Actions:
- `Save Source`
- `Save + Parse`

#### Manual Q&A mode
Inputs:
- question_text
- answer_text
- category
- tags

Actions:
- `Create Question`

### Data dependencies
- `POST /api/sources/upload`
- `POST /api/sources/text`
- `POST /api/manual-qa`
- `GET /api/sources`
- optional recent jobs feed via `GET /api/parse-jobs/:jobId`

### Page states
- empty: explain 3 import paths
- uploading/saving
- parse job created
- parse failed
- recent items available

### Done when
- User can complete ingestion without leaving the page.
- Recent sources / jobs are visible immediately.
- There is a clear next step into `Review Queue`.

---

## 3.2 `/review`
Purpose:
- queue view for pending parse outputs
- operational visibility over extraction results

### Layout
Single-page queue with filters.

Sections:
- status summary cards
- filters
- job list table

### Required columns
- job_id
- source title
- job_type
- status
- created_at
- updated_at / finished_at
- candidate_question_count (if available)
- actions

### Filters
- status
- kind
- keyword

### Actions
- `Open Review`
- `Retry`
- `View Source`

### Data dependencies
- list endpoint may be added as `GET /api/parse-jobs?status=...` even if not yet in api-schema.md
- existing minimum fallback: poll known jobs or show source-linked status list

### Page states
- empty queue
- pending/running jobs
- failed jobs
- needs_review jobs

### Done when
- User can quickly identify which parse result needs review.
- Failed jobs are operationally visible.
- `needs_review` items are one click away from confirmation.

---

## 3.3 `/review/:jobId`
Purpose:
- the critical human-in-the-loop review surface

### Layout
Recommended 3-column review desk.

```text
┌────────────────────┬─────────────────────────┬─────────────────────────┐
│ Left               │ Middle                  │ Right                   │
│ Source / raw text  │ Parse candidates        │ Merge target / preview  │
│                    │                         │                         │
│ source summary     │ editable cards          │ existing question match │
│ metadata           │ action per candidate    │ canonical question data │
│ raw snippet        │                         │ final import preview    │
└────────────────────┴─────────────────────────┴─────────────────────────┘
```

### Left column contract
Show:
- source title
- source kind
- interview metadata (if extracted)
- source summary
- raw text / snippet viewer

### Middle column contract
One card per `ParseQuestionCandidate`.

Each card must support:
- edit `question_text`
- edit `canonical_answer`
- edit `category`
- edit tags
- view `confidence`
- choose action:
  - `create`
  - `merge`
  - `skip`

### Right column contract
Context-sensitive.

If candidate has merge target:
- show existing canonical question
- show current canonical answer
- show tags/category
- show source_count
- show diff-ish preview if helpful

If no merge target:
- show “new question” preview

Bottom summary panel:
- created count
- merged count
- skipped count
- import CTA

### Required actions
- `Confirm Import`
- `Save Draft Review` (optional)
- `Retry Parse` (optional)
- `Back to Queue`

### Data dependencies
- `GET /api/parse-jobs/:jobId`
- `GET /api/parse-jobs/:jobId/result`
- `POST /api/parse-jobs/:jobId/confirm`
- supporting search for merge target may later use `GET /api/search?q=...&scope=questions`

### Page states
- loading job/result
- result ready
- no candidates extracted
- confirm in progress
- confirm success
- confirm failed

### Critical UX rules
- Do not auto-import directly after parse success.
- Avoid modal-per-candidate confirmation; keep review batchable.
- Keep raw source visible while editing candidates.
- Import summary must be visible before final confirmation.

### Done when
- A full interview source can be reviewed and imported in one pass.
- User can stop dirty data from entering canonical storage.
- Merge/create decisions are explicit and inspectable.

---

## 3.4 `/questions`
Purpose:
- primary study surface
- dense searchable question bank

### Layout
Recommended: filter sidebar + main list + optional detail drawer.

```text
┌──────────────┬──────────────────────────────┬────────────────────────┐
│ Filters      │ Question list                │ Detail drawer (opt)    │
│              │                              │                        │
│ category     │ search bar                   │ selected question      │
│ tag          │ sort                         │ answer variants        │
│ difficulty   │ rows/cards                   │ sources / related      │
│ source count │                              │                        │
└──────────────┴──────────────────────────────┴────────────────────────┘
```

### List row contract
Each row shows:
- question_text
- category
- tags
- source_count
- updated_at
- answer presence badge

### List actions
- open detail
- copy question
- start AI review from this question

### Filters
- keyword
- category
- tag
- difficulty
- has_personal_answer
- sort by `updated_at | source_count`

### Data dependencies
- `GET /api/questions`
- `GET /api/questions/:questionId`
- `PATCH /api/questions/:questionId`
- `GET /api/search`

### Page states
- empty bank
- no search result
- list loading
- detail loading

### Critical UX rules
- Optimize for scan speed, not decorative cards.
- Search must stay visible while browsing.
- Detail should expose canonical answer + variants + sources + related questions.

### Done when
- User can find a known question in seconds.
- Question detail is enough to review without opening raw files.
- Question bank feels like the default home surface after data exists.

---

## 3.5 `/questions/:questionId`
Purpose:
- direct-link detail view
- full review context for one question

### Sections
- header: question text, category, tags
- canonical answer
- answer variants
- related questions
- sources / linked interviews
- optional edit panel

### Actions
- edit canonical fields
- add answer variant
- open related source
- ask AI based on this question

### Done when
- This route can stand alone without the list page.

---

## 3.6 `/interviews`
Purpose:
- source-oriented browsing
- review interview experiences as grouped context

### Layout
List + filters + optional preview panel.

### List item contract
- company
- role
- round_info
- summary
- question_count
- tags
- updated_at

### Filters
- keyword
- company
- tag

### Data dependencies
- `GET /api/interviews`
- `GET /api/interviews/:interviewId`

### Done when
- User can browse by interview source, not only by canonical question.

---

## 3.7 `/interviews/:interviewId`
Purpose:
- detailed source context view

### Sections
- header metadata
- summary
- linked questions
- raw source snippet / source link

### Actions
- jump to canonical question
- open original source
- ask AI about this interview

---

## 3.8 `/qa`
Purpose:
- grounded study assistant surface
- retrieval-aware answer generation

### Layout
Recommended 3-region layout.

```text
┌────────────────────────────────────────────────────────────┐
│ Query input + session selector                            │
├───────────────────────┬────────────────────────────────────┤
│ Main answer area      │ Right panel                       │
│                       │ related questions                 │
│ answer                │ session history                   │
│ citations             │ quick jump links                  │
├───────────────────────┴────────────────────────────────────┤
│ Bottom / dev panel: retrieval trace / hits / strategy     │
└────────────────────────────────────────────────────────────┘
```

Alternative layout:
- answer center
- citations below answer
- right panel for related questions

### Required interactions
- ask question
- show loading/streaming state if supported
- show citations
- open cited question/source
- continue within session

### Data dependencies
- `POST /api/qa/sessions`
- `POST /api/qa/sessions/:sessionId/ask`
- `GET /api/qa/sessions/:sessionId`
- optional direct retrieval inspect via `POST /api/retrieval/query`

### Response rendering contract
Must show:
- answer
- citations
- related questions
- retrieval status (at least in dev mode)

Should show if available:
- top hits
- strategy used (`fts | hybrid`)
- uncertainty message when grounding is weak

### Critical UX rules
- Do not present answers without local grounding metadata.
- Avoid a generic chatbot look.
- Make references clickable and useful.

### Done when
- User can ask a question and clearly see what local knowledge supports the answer.
- The page feels like a study tool, not a raw LLM shell.

---

## 3.9 `/qa/:sessionId`
Purpose:
- session detail / reloadable continuation

### Sections
- session header
- turn history
- newest answer block
- citations per turn
- optional retrieval trace expander

---

## 3.10 `/resume`
Purpose:
- entry page for resume ingestion and extracted projects

### Layout
2 sections:
- current resume source / parse state
- project list

### Actions
- upload resume
- parse resume
- view extracted projects

### Data dependencies
- `POST /api/sources/upload` with `kind=resume`
- `POST /api/parse-jobs`
- `POST /api/resumes/from-source`
- `GET /api/resumes/:resumeId/projects`

---

## 3.11 `/resume/projects/:projectId`
Purpose:
- one project as the deep-dive unit

### Sections
- project summary
- highlights
- tech stack
- suggested deep-dive questions
- session history

### Actions
- start deep-dive session
- start mock interview

### Data dependencies
- `GET /api/resume-projects/:projectId`
- `POST /api/resume-projects/:projectId/deep-dive-sessions`

---

## 3.12 `/resume/projects/:projectId/session/:sessionId`
Purpose:
- multi-turn project deep-dive / mock interview surface

### Layout
Conversation-like main area, but with project context panel.

```text
┌───────────────────────┬────────────────────────────────────┐
│ Main transcript       │ Project context                    │
│                       │                                    │
│ interviewer question  │ summary                            │
│ user answer           │ highlights                         │
│ coach hints           │ tech stack                         │
│ next question         │ related notes                      │
└───────────────────────┴────────────────────────────────────┘
```

### Required interactions
- submit answer
- receive next question
- view coach hints
- review transcript history

### Critical UX rules
- This page can look more conversational than `/qa`, but still needs context anchoring.
- Avoid pure chat UI with zero project metadata.

---

## 4. Cross-page flows

## 4.1 Import -> Parse -> Review -> Question Bank

```text
/import
  -> create source
  -> create parse job
  -> status pending/running
  -> /review
  -> /review/:jobId
  -> confirm import
  -> /questions?source=...
```

User goal:
- turn one raw interview document into canonical questions

System checkpoints:
- source created
- parse result stored
- review decisions captured
- canonical writes succeed

---

## 4.2 Question Bank -> AI Review

```text
/questions
  -> open question detail
  -> ask AI based on this question
  -> /qa or /qa/:sessionId
  -> grounded answer + citations
```

User goal:
- move from static review to interactive drill-down

---

## 4.3 Interview Notes -> Canonical Question

```text
/interviews
  -> /interviews/:interviewId
  -> linked question click
  -> /questions/:questionId
```

User goal:
- trace one source context back into standardized bank entries

---

## 4.4 Resume -> Project -> Deep Dive Session

```text
/resume
  -> parse resume
  -> extracted projects
  -> /resume/projects/:projectId
  -> start deep dive session
  -> /resume/projects/:projectId/session/:sessionId
```

User goal:
- practice project storytelling and follow-up handling

---

## 5. Shared component contracts

## 5.1 `SourceStatusBadge`
Inputs:
- `parse_status`

Renders:
- `not_started`
- `pending`
- `running`
- `needs_review`
- `confirmed`
- `failed`

## 5.2 `QuestionCard` / `QuestionRow`
Inputs:
- question summary object

Used in:
- question list
- related questions
- interview detail
- QA citations

## 5.3 `CitationList`
Inputs:
- citations array

Each citation should support:
- label
- link target
- owner type badge

## 5.4 `RetrievalTracePanel`
Inputs:
- strategy
- hits
- final context summary
- debug mode flag

Rule:
- safe to hide in user mode, but keep implementation clean because it is valuable for evaluation/debug.

## 5.5 `ParseCandidateEditor`
Inputs:
- parse candidate
- possible merge target

Outputs:
- normalized review payload for confirm API

This is likely the most important custom component in MVP-1.

---

## 6. State model by page type

## 6.1 List page state shape
```ts
interface ListPageState<T> {
  items: T[]
  loading: boolean
  error?: string | null
  page: number
  page_size: number
  total: number
  filters: Record<string, unknown>
}
```

## 6.2 Review page local state shape
```ts
interface ReviewPageState {
  jobId: string
  sourceLoaded: boolean
  resultLoaded: boolean
  submitStatus: 'idle' | 'submitting' | 'success' | 'failed'
  decisions: ReviewDecision[]
}

interface ReviewDecision {
  candidateIndex: number
  action: 'create' | 'merge' | 'skip'
  targetQuestionId?: string | null
  questionText: string
  canonicalAnswer?: string | null
  category?: string | null
  tags: string[]
}
```

## 6.3 QA page local state shape
```ts
interface QaPageState {
  sessionId?: string | null
  submitting: boolean
  query: string
  turns: Array<{
    role: 'user' | 'assistant'
    content: string
    retrievalLogId?: string | null
  }>
  latestCitations: Array<{
    ownerType: string
    ownerId: string
    label: string
  }>
}
```

---

## 7. Empty / loading / error patterns

## 7.1 Empty states
Each major page should have a purposeful empty state.

Examples:
- `/questions`: “No questions yet. Import an interview note or create one manually.”
- `/review`: “No items need review right now.”
- `/qa`: “Ask a grounded question based on your interview bank.”
- `/resume`: “Upload your resume to extract projects for deep dive.”

## 7.2 Loading states
- list pages: skeleton rows
- detail pages: skeleton sections
- review page: keep source shell visible while candidates load if possible
- QA: preserve previous turn history while new answer is loading

## 7.3 Error states
Expose actionable retry path.

Examples:
- parse failed -> `Retry Parse`
- retrieval unavailable -> allow answer retry or fallback search
- confirm failed -> keep unsent review decisions in page state if possible

---

## 8. Suggested implementation order for frontend

1. App shell + routes
2. `/import`
3. `/review`
4. `/review/:jobId`
5. `/questions`
6. `/questions/:questionId`
7. `/interviews`
8. `/interviews/:interviewId`
9. `/qa`
10. `/qa/:sessionId`
11. `/resume`
12. project deep dive routes

Reason:
- This mirrors the business-critical data flow.
- It avoids building chat UI before canonical knowledge workflows exist.

---

## 9. Codex-friendly task slices

Recommended coding tasks for agent delegation:

### Slice A
- build app shell
- left nav
- route scaffolding
- empty states

### Slice B
- build `/import`
- upload/paste/manual forms
- recent source/job panel

### Slice C
- build `/review` queue
- status badges
- filters/table

### Slice D
- build `/review/:jobId`
- 3-column review desk
- parse candidate editor
- final import payload assembly

### Slice E
- build `/questions`
- filters + list + detail drawer

### Slice F
- build `/qa`
- answer panel + citations + retrieval trace panel

### Slice G
- build `/resume` and project deep-dive routes

These slices are intentionally bounded so Codex can implement them with lower drift.

---

## 10. Acceptance checklist

- [ ] Import page supports upload, paste, manual Q&A
- [ ] Review Queue clearly exposes `needs_review`
- [ ] Review detail page supports batch create/merge/skip
- [ ] Question Bank is dense, searchable, and source-aware
- [ ] Interview Notes view supports source-centric browsing
- [ ] AI Review page shows citations and avoids plain-chat feel
- [ ] Resume/Project pages anchor deep-dive flows in structured project data
- [ ] Major pages have empty/loading/error states
- [ ] Routes are stable and directly reloadable
- [ ] UI layout aligns with API/data model docs

---

## 11. Design summary

If forced to optimize for one thing, optimize for:

**reviewability and retrievability over conversational polish**

Because the product wins when:
- imported data stays clean
- questions are easy to find
- AI answers are visibly grounded

Not when it looks the most like a chatbot.
