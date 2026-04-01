# Open Interview Data Model（agent-facing, v0）

- doc_type: data_model
- audience: agents / implementers
- status: draft
- updated_at: 2026-04-01
- parent_doc: `docs/technical-design.md`
- canonical_for: core entities, field contracts, relationships, state transitions

> 本文档是技术设计子文档，负责数据模型与状态流转；全局架构总览、最新框架图与 roadmap 见 `docs/technical-design.md`。

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
- `interview_question` is the canonical unit for extracted interview questions before any manual promotion to the bank.
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
  ├─ 1:n interview_question
  └─ n:n question_item   (via interview_question_link / source_question_ref after promotion)

interview_question
  ├─ n:n tag             (via interview_question_tag)
  └─ n:n question_item   (via interview_question_link)

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
  ├─ 0..1 chunk_embedding
  ├─ 0..1 chunk_vector_sync_state
  └─ 0..n vector_sync_job
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
  answer?: string | null
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
- `answer` 是 parse review 阶段的主候选答案字段；兼容旧结果时仍可读取 `canonical_answer` / `source_answer`。
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

## 2.5 interview_question
Interview-only extracted question before promotion into the bank.

```ts
interface InterviewQuestion {
  id: string
  interview_experience_id: string
  source_document_id: string
  question_text: string
  normalized_question_text: string
  source_answer?: string | null
  source_snippet?: string | null
  source_order?: number | null
  category?: string | null
  created_at: string
  updated_at: string
}
```

Rules:
- `interview_question` 保留面经题原始语境，不自动进入 `question_item`。
- 只有显式执行 promote / merge 后，才建立到题库的正式关联。

## 2.6 question_item
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
- `canonical_answer` is the current primary answer stored in the question bank.
- Human-reviewed parse confirm and manual Q&A import should prefer the reviewed single `answer`; when兼容旧 parse payload 时仍优先采用上传来源中的答案文本。
- `review_status='draft'` can be used if future flows allow unreviewed entries.

## 2.7 answer_variant
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

Notes:
- `personal` is retained as a legacy/internal variant type, but question-bank browse APIs should not expose it as a first-class filter or separate primary-answer concept.

## 2.8 tag
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

## 2.9 source_question_ref
Many-to-many mapping between source_document and canonical question.

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

Rules:
- `source_question_ref` 只在题库题已经成立后创建，不再承担面经原题本体存储。

## 2.10 interview_question_link
Formal many-to-many mapping between interview questions and bank questions after manual promotion.

```ts
interface InterviewQuestionLink {
  id: string
  interview_question_id: string
  question_item_id: string
  link_type: 'promoted_create' | 'promoted_merge'
  created_at: string
}
```

## 2.11 question_tag
```ts
interface QuestionTag {
  question_item_id: string
  tag_id: string
}
```

## 2.12 resume_document
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

## 2.13 resume_project
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
  answer_mode?: 'grounded_answered' | 'weak_support' | 'no_grounded_support' | null
  support_summary?: string | null
  retrieval_log_id?: string | null
  created_at: string
}
```

## 2.13A assessment_session
10 题模拟考试的整套快照与评分结果。

```ts
interface AssessmentSession {
  id: string
  mode: 'exam'
  status: 'active' | 'scoring' | 'completed' | 'failed'
  question_count: number
  total_score?: number | null
  max_score: number
  summary_json?: AssessmentResultSummary | null
  scoring_provider: 'openclaw'
  started_at: string
  submitted_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}
```

Rules:
- 题面、标准答案和分类标签必须快照到 item 层，不能依赖考试后再次回读题库。
- `failed` 允许保留 fallback summary，避免整套考试完全失去结果。
- `summary_json` 默认写入 Practice V2 结构：本次考试维度摘要 + 长期画像更新摘要；历史 MVP-1 记录允许继续保留动态 `radar_dimensions` 以兼容回看。

## 2.13B assessment_item
```ts
interface AssessmentItem {
  id: string
  assessment_session_id: string
  question_item_id: string
  sequence_no: number
  question_text_snapshot: string
  canonical_answer_snapshot?: string | null
  category_snapshot?: string | null
  difficulty_snapshot?: 'easy' | 'medium' | 'hard' | null
  tags_json: string
  dimension_weights_json?: Array<{
    key: PracticeDimensionKey
    weight: number
  }> | null
  user_answer?: string | null
  score?: number | null
  max_score: number
  feedback_json?: {
    strengths: string[]
    missed_points: string[]
    improvement_advice: string
  } | null
  skill_scores_json?: {
    accuracy: number
    coverage: number
    clarity: number
  } | null
  created_at: string
  updated_at: string
}
```

Rules:
- 模拟考试只从带 `canonical_answer` 的 active `question_item` 抽题。
- `sequence_no` 在单个 session 内必须稳定且唯一。
- 创建考试时需要把固定维度映射结果快照到 `dimension_weights_json`，避免后续 taxonomy 或映射规则变化导致历史画像漂移。
- 若旧考试缺少 `dimension_weights_json`，该场考试允许继续展示历史结果，但不参与长期画像回填。

## 2.13C practice dimension catalog
```ts
type PracticeDimensionKey =
  | 'java_fundamentals'
  | 'database_storage'
  | 'distributed_systems'
  | 'computer_fundamentals'
  | 'system_design_engineering'
  | 'agent_capability'
```

Suggested labels:
- `java_fundamentals`: Java基础
- `database_storage`: 数据库与存储
- `distributed_systems`: 分布式
- `computer_fundamentals`: 计算机基础
- `system_design_engineering`: 系统设计与工程实践
- `agent_capability`: Agent能力

Rules:
- 固定维度 catalog 是长期能力画像的唯一雷达轴；`category` / `tag` 只是映射信号，不再直接作为最终雷达维度。
- `exam_radar` 与 `profile_radar` 共享同一套 catalog，前者只显示本场覆盖维度，后者始终显示全量维度。
- 题目允许命中多个固定维度，权重总和应为 `1.0`。
- 当前映射由配置驱动，主要使用 `question_item.category` 和 tags；无命中时回退到 `system_design_engineering`。

## 2.13D practice_profile
```ts
interface PracticeProfile {
  id: string
  scope: 'local_default'
  dimension_catalog_version: string
  last_exam_session_id?: string | null
  last_assessed_at?: string | null
  created_at: string
  updated_at: string
}
```

Rules:
- 当前仓库未建多用户 ownership；MVP-2 先使用 local-first singleton profile。
- profile 不直接存题库 taxonomy，只存固定维度画像状态与最近一次更新元数据。
- 历史考试不做自动回填；profile 只从带维度快照的新考试结果增量更新。

## 2.13E practice_profile_dimension
```ts
interface PracticeProfileDimension {
  id: string
  practice_profile_id: string
  dimension_key: PracticeDimensionKey
  score: number
  evidence_count: number
  last_exam_score?: number | null
  last_coverage_weight?: number | null
  last_assessed_at?: string | null
  created_at: string
  updated_at: string
}
```

Rules:
- `score` 范围固定为 `0-10`，与单题考试分数保持一致。
- `evidence_count` 表示该维度累计覆盖证据，不要求是整数。
- 只更新本场考试覆盖到的维度；未覆盖维度保持原值，不因缺考自动下降。
- 建议使用 coverage-weighted smoothing：
  - `coverage_weight = Σ(item.dimension_weight)`
  - `alpha = clamp(0.08 + 0.06 * coverage_weight, 0.08, 0.35)`
  - `new_score = old_score * (1 - alpha) + exam_dimension_score * alpha`
- `exam_dimension_score` 应由本场考试内该维度加权平均得到，而不是直接复用原始 taxonomy bucket。

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

## 2.15 chunk_embedding
```ts
interface ChunkEmbedding {
  id: string
  chunk_id: string
  provider: string
  model: string
  content_hash: string
  status: 'pending' | 'ready' | 'failed'
  dims?: number | null
  last_embedded_at?: string | null
  last_error?: string | null
  created_at: string
  updated_at: string
}
```

Rules:
- SQLite 只保存 embedding 的 provider / model / hash / status 元数据，不再把 `vector_json` 当 canonical 路线。
- 若 chunk 内容、embedding model 或 provider 变化，需要把 status 重置为 `pending`。
- `chunk_id` 必须稳定，供 Milvus upsert / delete / citation / retrieval log 复用。

## 2.16 chunk_vector_sync_state
```ts
interface ChunkVectorSyncState {
  id: string
  chunk_id: string
  backend: 'milvus'
  collection_name: string
  document_id: string
  content_hash: string
  sync_status: 'pending' | 'synced' | 'failed'
  last_synced_at?: string | null
  last_error?: string | null
  created_at: string
  updated_at: string
}
```

Rules:
- `document_id` 默认与 `chunk_id` 保持一致，避免引入第二套向量文档主键。
- 只复制 retrieval 所需的 metadata 到 Milvus，不把业务主数据迁入向量库。
- collection rebuild / delete / resync 必须显式更新这里的状态。

## 2.17 vector_sync_job
```ts
interface VectorSyncJob {
  id: string
  backend: 'milvus'
  job_type: 'backfill' | 'delete_chunk' | 'rebuild'
  status: 'pending' | 'running' | 'completed' | 'failed'
  collection_name: string
  target_chunk_id?: string | null
  target_owner_type?: 'source_document' | 'question_item' | 'answer_variant' | 'resume_project' | null
  target_owner_id?: string | null
  attempt_count: number
  last_error?: string | null
  started_at?: string | null
  finished_at?: string | null
  created_at: string
  updated_at: string
}
```

## 2.18 retrieval_log
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
- `chunk_embeddings`
- `chunk_vector_sync_states`
- `vector_sync_jobs`
- `retrieval_logs`
- `assessment_sessions`
- `assessment_items`

Deferred after MVP-1（当前不要求在 Slice 1 落表）:
- `practice_profiles`
- `practice_profile_dimensions`
- `resume_documents`
- `resume_projects`
- `ai_sessions`
- `session_turns`

Recommendation:
- 在 Milvus foundation 落地后，`chunks`、`chunk_embeddings`、`chunk_vector_sync_states`、`vector_sync_jobs` 共同承接 retrieval metadata / sync 状态。
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
- interviewer-style persona engine / voice interview runtime
- workflow DAG orchestration

---

## 8. Implementation notes

Recommended MVP stack mapping:
- DB: SQLite
- ORM: Prisma or Drizzle
- Search: SQLite FTS5
- Embedding state: SQLite metadata + Milvus vector backend
- AI provider/orchestrator: OpenClaw adapter

If the project later needs stronger resume value, the clean upgrade path is:
- SQLite -> Postgres
- Milvus standalone -> stronger managed vector infra when justified
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
