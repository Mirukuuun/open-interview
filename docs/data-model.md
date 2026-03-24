# Open Interview Data Model（agent-facing, v0）

- doc_type: data_model
- audience: agents / implementers
- status: draft
- updated_at: 2026-03-23
- canonical_for: core entities, field contracts, relationships, state transitions

## 0. Agent-facing rules

This document is optimized for agents, not PM-style reading.

### Contract rules
- All IDs are opaque strings.
- All timestamps use ISO-8601 UTC strings unless explicitly noted.
- Enums use `snake_case`.
- Unknown optional fields should be omitted, not guessed.
- Explicitly cleared values should use `null`.
- Agent outputs must follow the schemas here; do not invent extra top-level fields unless versioned.

### Design rules
- `source_document` is the raw truth source.
- `question_item` is the canonical review unit.
- `interview_experience` is a source/context record, not the canonical question bank itself.
- AI parse results must land in `parse_job.result_json` first, then enter human review before canonical write.
- RAG is grounded on `chunk` + `embedding`, but the product truth still lives in structured entities.

---

## 1. Entity graph

```text
source_document
  ├─ 1:1..n parse_job
  ├─ 0..1 interview_experience
  ├─ 0..1 resume_document
  └─ 0..n chunk

interview_experience
  └─ n:n question_item   (via source_question_ref)

question_item
  ├─ 1:n answer_variant
  ├─ n:n tag             (via question_tag)
  ├─ n:n source_document (via source_question_ref)
  ├─ 0..n chunk
  └─ 0..n retrieval_log_hit

resume_document
  └─ 1:n resume_project

resume_project
  ├─ 0..n chunk
  └─ 1:n ai_session      (deep_dive / mock_interview)

ai_session
  └─ 1:n session_turn

chunk
  └─ 0..1 embedding
```

---

## 2. Canonical entities

## 2.1 source_document
Raw imported material.

```ts
interface SourceDocument {
  id: string
  kind: 'interview_experience' | 'knowledge_note' | 'resume' | 'manual_input'
  title: string
  raw_text: string
  file_name?: string
  mime_type?: string
  file_path?: string
  source_url?: string | null
  language?: string | null
  status: 'active' | 'archived'
  parse_status: 'not_started' | 'pending' | 'running' | 'needs_review' | 'confirmed' | 'failed'
  created_at: string
  updated_at: string
}
```

Notes:
- `raw_text` should always exist after ingestion, even for uploaded files.
- `file_path` is optional because pasted/manual inputs may not have a file.
- `parse_status` is a convenience field; detailed execution history lives in `parse_job`.

## 2.2 parse_job
Asynchronous extraction job for a source.

```ts
interface ParseJob {
  id: string
  source_document_id: string
  job_type: 'extract_interview' | 'extract_resume' | 'normalize_manual_input'
  provider: 'openclaw'
  status: 'pending' | 'running' | 'success' | 'failed' | 'needs_review' | 'confirmed'
  attempt_count: number
  prompt_version?: string | null
  error_message?: string | null
  result_json?: ParseResult | null
  created_at: string
  started_at?: string | null
  finished_at?: string | null
}
```

## 2.3 parse_result
Not a top-level table by default; stored in `parse_job.result_json`.

```ts
interface ParseResult {
  source_summary?: string
  source_kind_guess?: 'interview_experience' | 'knowledge_note' | 'resume' | 'manual_input'
  interview_experience?: ParseInterviewExperience | null
  questions: ParseQuestionCandidate[]
  resume_projects?: ParseResumeProjectCandidate[]
  warnings?: string[]
}

interface ParseInterviewExperience {
  company?: string | null
  role?: string | null
  round_info?: string | null
  summary?: string | null
  tags?: string[]
}

interface ParseQuestionCandidate {
  question_text: string
  canonical_answer?: string | null
  source_answer?: string | null
  category?: string | null
  tags?: string[]
  confidence?: number | null
  merge_hint_question_id?: string | null
}

interface ParseResumeProjectCandidate {
  name: string
  summary?: string | null
  highlights?: string[]
  tech_stack?: string[]
  deep_dive_questions?: string[]
}
```

Rules:
- `questions` is required and may be empty.
- `confidence` is advisory only; never auto-confirm solely from confidence.
- `merge_hint_question_id` is only a hint for review UI.

## 2.4 interview_experience
One imported interview note / interview report.

```ts
interface InterviewExperience {
  id: string
  source_document_id: string
  company?: string | null
  role?: string | null
  round_info?: string | null
  summary?: string | null
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}
```

## 2.5 question_item
Canonical question bank unit.

```ts
interface QuestionItem {
  id: string
  question_text: string
  normalized_question_text: string
  canonical_answer?: string | null
  category?: string | null
  difficulty?: 'easy' | 'medium' | 'hard' | null
  source_count: number
  answer_variant_count: number
  review_status: 'draft' | 'active' | 'archived'
  created_from: 'ai_parse' | 'manual'
  created_at: string
  updated_at: string
}
```

Rules:
- `normalized_question_text` is used for dedupe and exact-ish matching.
- `canonical_answer` is the best current default answer, not the only answer.
- `review_status='draft'` can be used if future flows allow unreviewed entries.

## 2.6 answer_variant
Multiple answer views for one question.

```ts
interface AnswerVariant {
  id: string
  question_item_id: string
  variant_type: 'canonical' | 'personal' | 'concise' | 'deep_dive' | 'follow_up'
  content: string
  author_type: 'user' | 'ai' | 'system'
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}
```

## 2.7 tag
Shared tag entity.

```ts
interface Tag {
  id: string
  name: string
  normalized_name: string
  tag_type: 'topic' | 'company' | 'role' | 'skill' | 'custom'
  created_at: string
}
```

## 2.8 source_question_ref
Many-to-many mapping between source/interview and canonical question.

```ts
interface SourceQuestionRef {
  id: string
  source_document_id: string
  question_item_id: string
  source_snippet?: string | null
  source_order?: number | null
  created_at: string
}
```

## 2.9 question_tag
```ts
interface QuestionTag {
  question_item_id: string
  tag_id: string
}
```

## 2.10 resume_document
Structured resume root.

```ts
interface ResumeDocument {
  id: string
  source_document_id: string
  candidate_name?: string | null
  summary?: string | null
  created_at: string
  updated_at: string
}
```

## 2.11 resume_project
Project extracted from resume.

```ts
interface ResumeProject {
  id: string
  resume_document_id: string
  name: string
  summary?: string | null
  highlights_json?: string | null
  tech_stack_json?: string | null
  deep_dive_questions_json?: string | null
  created_at: string
  updated_at: string
}
```

Note:
- JSON string fields are acceptable in SQLite MVP. If schema evolves, they can be normalized later.

## 2.12 ai_session
General session model for QA and deep dive.

```ts
interface AiSession {
  id: string
  session_type: 'qa' | 'resume_deep_dive' | 'mock_interview'
  status: 'active' | 'completed' | 'archived'
  related_resume_project_id?: string | null
  provider: 'openclaw'
  title?: string | null
  created_at: string
  updated_at: string
}
```

## 2.13 session_turn
```ts
interface SessionTurn {
  id: string
  ai_session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  citations_json?: string | null
  retrieval_log_id?: string | null
  created_at: string
}
```

## 2.14 chunk
RAG retrieval unit.

```ts
interface Chunk {
  id: string
  owner_type: 'source_document' | 'question_item' | 'answer_variant' | 'resume_project'
  owner_id: string
  chunk_type: 'source_excerpt' | 'question' | 'answer' | 'project_summary'
  content: string
  token_count?: number | null
  source_order?: number | null
  embedding_status: 'pending' | 'ready' | 'failed'
  created_at: string
  updated_at: string
}
```

Chunking rules for MVP:
- `question_item.question_text` should become its own chunk.
- `canonical_answer` should become one chunk if present.
- `source_document` may be chunked into bounded excerpts only when needed.
- Avoid one giant resume/source blob as a single retrieval unit.

## 2.15 embedding
```ts
interface Embedding {
  id: string
  chunk_id: string
  provider: string
  model: string
  vector_json: string
  dims: number
  created_at: string
}
```

MVP note:
- `vector_json` in SQLite is acceptable for low scale.
- If later migration introduces pgvector or external vector DB, keep `chunk_id` stable.

## 2.16 retrieval_log
Stores explainable retrieval traces.

```ts
interface RetrievalLog {
  id: string
  query_text: string
  query_type: 'qa' | 'resume_deep_dive' | 'mock_interview'
  strategy: 'fts' | 'vector' | 'hybrid'
  hits_json: string
  final_context_json: string
  created_at: string
}
```

Purpose:
- Debug retrieval quality.
- Support agent-facing observability.
- Make the project more resume-worthy than a plain chat wrapper.

---

## 3. Minimal SQL table set for MVP

Required in MVP-1:
- `source_documents`
- `parse_jobs`
- `interview_experiences`
- `question_items`
- `answer_variants`
- `tags`
- `question_tags`
- `source_question_refs`
- `chunks`
- `embeddings`
- `retrieval_logs`

Deferred after MVP-1（当前不要求在 Slice 1 落表）:
- `resume_documents`
- `resume_projects`
- `ai_sessions`
- `session_turns`

Recommendation:
- 在 MVP-1 先把 `chunks`、`embeddings`、`retrieval_logs` 的 schema 位置占住，便于后续 Slice 4/5 接入 grounded QA。
- `resume` / `session` 相关表延后到 Resume / deep dive 相关 slice 再补，不阻塞当前题库主链。

---

## 4. State transitions

## 4.1 source_document.parse_status
```text
not_started -> pending -> running -> needs_review -> confirmed
                               └-> failed
```

Rules:
- `confirmed` means reviewed and imported.
- `failed` should preserve raw source for retry.

## 4.2 parse_job.status
```text
pending -> running -> success -> needs_review -> confirmed
                 └-> failed
```

Notes:
- `success` means extraction returned structurally valid output.
- `needs_review` means awaiting human confirmation.
- `confirmed` means canonical writes are completed.

## 4.3 chunk.embedding_status
```text
pending -> ready
        └-> failed
```

---

## 5. Dedupe / merge rules

## 5.1 question dedupe key
Primary heuristic for MVP:
- normalize whitespace
- lowercase ASCII
- strip leading numbering / bullets
- optionally strip terminal punctuation

Suggested field:
- `normalized_question_text`

## 5.2 merge behavior
When parse candidate matches an existing question:
- keep existing `question_item`
- append new `source_question_ref`
- optionally add `answer_variant` if source answer is meaningfully different
- do not silently overwrite canonical answer unless confirmed

---

## 6. Retrieval strategy contract

## 6.1 Retrieval sources
Allowed retrieval owners in MVP-2:
- `question_item`
- `answer_variant`
- `source_document`
- `resume_project`

## 6.2 Hybrid retrieval shape
```ts
interface RetrievalHit {
  owner_type: 'question_item' | 'answer_variant' | 'source_document' | 'resume_project'
  owner_id: string
  chunk_id?: string | null
  score: number
  reason: 'fts' | 'vector' | 'merged'
  snippet: string
}
```

## 6.3 QA context shape
```ts
interface QaContextPacket {
  query: string
  top_hits: RetrievalHit[]
  related_question_ids: string[]
}
```

---

## 7. Non-goals in current schema

Not modeling yet:
- multi-user auth / ownership
- company application pipeline
- spaced repetition / memory scheduler
- score rubric / interviewer rubric engine
- workflow DAG orchestration

---

## 8. Implementation notes

Recommended MVP stack mapping:
- DB: SQLite
- ORM: Prisma or Drizzle
- Search: SQLite FTS5
- Embedding storage: SQLite JSON for MVP
- AI provider/orchestrator: OpenClaw adapter

If the project later needs stronger resume value, the clean upgrade path is:
- SQLite -> Postgres
- `vector_json` -> pgvector
- simple merge -> hybrid retrieval + rerank

---

## 9. Canonical examples

## 9.1 question_item example
```json
{
  "id": "q_redis_lock_001",
  "question_text": "Redis 分布式锁会遇到哪些问题？",
  "normalized_question_text": "redis 分布式锁会遇到哪些问题",
  "canonical_answer": "需要考虑锁误删、可重入、续约、主从切换一致性、超时与兜底方案。",
  "category": "distributed_system",
  "difficulty": "medium",
  "source_count": 3,
  "answer_variant_count": 2,
  "review_status": "active",
  "created_from": "ai_parse",
  "created_at": "2026-03-23T11:00:00Z",
  "updated_at": "2026-03-23T11:10:00Z"
}
```

## 9.2 retrieval_log example
```json
{
  "id": "ret_001",
  "query_text": "怎么回答 Redis 锁和 RedLock 的问题？",
  "query_type": "qa",
  "strategy": "hybrid",
  "hits_json": "[{\"owner_type\":\"question_item\",\"owner_id\":\"q_redis_lock_001\",\"score\":0.92,\"reason\":\"merged\",\"snippet\":\"Redis 分布式锁会遇到哪些问题？\"}]",
  "final_context_json": "{\"question_ids\":[\"q_redis_lock_001\"],\"chunk_ids\":[\"chunk_101\"]}",
  "created_at": "2026-03-23T11:20:00Z"
}
```
