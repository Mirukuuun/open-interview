# Open Interview API Schema（agent-facing, v0）

- doc_type: api_schema
- audience: agents / implementers
- status: draft
- updated_at: 2026-03-28
- parent_doc: `docs/technical-design.md`
- canonical_for: HTTP endpoints, request/response contracts, async flow conventions

> 本文档是技术设计子文档，负责 API 契约；全局架构总览、最新框架图与 roadmap 见 `docs/technical-design.md`。

## 0. Agent-facing rules

### API style
- Base path: `/api`
- JSON responses default to `application/json`
- Success responses use `{ ok: true, data: ... }`
- Error responses use `{ ok: false, error: { code, message, details? } }`
- List responses use `{ ok: true, data: { items, page, page_size, total } }`
- Async jobs always expose a pollable job endpoint

### Contract rules
- Do not infer missing fields.
- Unknown filters should be ignored, not crash the request.
- Stable field names are preferred over clever nesting.
- Agent callers should assume backward-compatible additive changes only.

---

## 1. Shared response envelopes

## 1.1 Success
```json
{
  "ok": true,
  "data": {}
}
```

## 1.2 Error
```json
{
  "ok": false,
  "error": {
    "code": "invalid_request",
    "message": "question_text is required"
  }
}
```

## 1.3 Paginated list
```json
{
  "ok": true,
  "data": {
    "items": [],
    "page": 1,
    "page_size": 20,
    "total": 0
  }
}
```

## 1.4 GET `/api/health`
Operational health probe.

### Response highlights
- `status` stays `ok` for the web service envelope.
- `data.vector_backend` exposes Milvus foundation state:
  - `enabled`
  - `status = ok | pending | disabled | degraded`
  - chunk / embedding / sync counters
  - latest sync job snapshot

---

## 2. Ingestion APIs

## 2.1 POST `/api/sources/text`
Create a source from pasted text.

### Request
```json
{
  "title": "美团后端一面面经",
  "kind": "interview_experience",
  "raw_text": "...",
  "source_url": null
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "source_document": {
      "id": "src_001",
      "parse_status": "not_started"
    }
  }
}
```

### Import rule
- 确认导入时，题库只保留一个主答案；如果同时提交 `source_answer` 和 `canonical_answer`，服务会优先将来源答案写入 `canonical_answer`。

## 2.2 POST `/api/sources/upload`
Multipart upload for file-based source.

### Multipart fields
- `file`: binary
- `kind`: `interview_experience | knowledge_note | resume`
- `title`: optional string
- `source_url`: optional string

### Response
```json
{
  "ok": true,
  "data": {
    "source_document": {
      "id": "src_002",
      "file_name": "resume.pdf",
      "parse_status": "not_started"
    }
  }
}
```

## 2.3 POST `/api/manual-qa`
Direct manual single-item creation.

### Request
```json
{
  "question_text": "ThreadLocal 会导致什么问题？",
  "answer_text": "在线程池场景下如果不 remove，可能导致脏数据和内存泄漏。",
  "category": "java_concurrency",
  "tags": ["threadlocal", "java"]
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "question_item": {
      "id": "q_001"
    },
    "answer_variant": {
      "id": "ans_001"
    }
  }
}
```

## 2.4 GET `/api/sources`
List imported sources.

### Query params
- `kind?`
- `parse_status?`
- `q?`
- `page?`
- `page_size?`

---

## 3. Parse job APIs

## 3.1 POST `/api/parse-jobs`
Create parse job for a source.

### Request
```json
{
  "source_document_id": "src_001",
  "job_type": "extract_interview"
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "parse_job": {
      "id": "job_001",
      "status": "pending"
    }
  }
}
```

## 3.2 GET `/api/parse-jobs/:jobId`
Poll job status and result summary.

### Response
```json
{
  "ok": true,
  "data": {
    "parse_job": {
      "id": "job_001",
      "status": "needs_review",
      "job_type": "extract_interview",
      "error_message": null,
      "created_at": "2026-03-23T11:00:00Z",
      "started_at": "2026-03-23T11:00:02Z",
      "finished_at": "2026-03-23T11:00:15Z"
    }
  }
}
```

## 3.3 GET `/api/parse-jobs/:jobId/result`
Return full parse result for review UI.

### Response
```json
{
  "ok": true,
  "data": {
    "result": {
      "source_summary": "一面偏 Java 基础 + Redis + MQ",
      "interview_experience": {
        "company": "美团",
        "role": "后端开发",
        "round_info": "一面",
        "summary": "偏中间件与并发",
        "tags": ["java", "redis", "mq"]
      },
      "questions": [
        {
          "question_text": "Redis 分布式锁会遇到哪些问题？",
          "canonical_answer": "需要考虑误删、续约、主从切换一致性等。",
          "category": "distributed_system",
          "tags": ["redis", "lock"],
          "confidence": 0.87,
          "merge_hint_question_id": "q_redis_lock_001"
        }
      ],
      "warnings": []
    }
  }
}
```

## 3.4 POST `/api/parse-jobs/:jobId/confirm`
Human-reviewed import into canonical tables.

### Request
```json
{
  "interview_experience": {
    "company": "美团",
    "role": "后端开发",
    "round_info": "一面",
    "summary": "偏中间件与并发",
    "tags": ["java", "redis", "mq"]
  },
  "questions": [
    {
      "action": "merge",
      "target_question_id": "q_redis_lock_001",
      "question_text": "Redis 分布式锁会遇到哪些问题？",
      "canonical_answer": "需要考虑误删、续约、主从切换一致性等。",
      "category": "distributed_system",
      "tags": ["redis", "lock"]
    },
    {
      "action": "create",
      "question_text": "为什么 ThreadLocal 在线程池里要手动清理？",
      "canonical_answer": "线程复用可能导致数据串用与内存泄漏。",
      "category": "java_concurrency",
      "tags": ["threadlocal", "thread_pool"]
    }
  ]
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "parse_job": {
      "id": "job_001",
      "status": "confirmed"
    },
    "import_summary": {
      "created_questions": 1,
      "merged_questions": 1,
      "created_interview_experience_id": "intv_001"
    }
  }
}
```

---

## 4. Question bank APIs

## 4.1 GET `/api/questions`
List question items.

### Query params
- `q?`: keyword
- `category?`
- `tag?`
- `difficulty?`
- `page?`
- `page_size?`
- `sort?`: `updated_at | source_count`

### Response item shape
```json
{
  "id": "q_redis_lock_001",
  "question_text": "Redis 分布式锁会遇到哪些问题？",
  "category": "distributed_system",
  "difficulty": "medium",
  "source_count": 3,
  "updated_at": "2026-03-23T11:10:00Z",
  "tags": ["redis", "lock"]
}
```

## 4.2 GET `/api/questions/:questionId`
Question detail.

### Response
```json
{
  "ok": true,
  "data": {
    "question_item": {
      "id": "q_redis_lock_001",
      "question_text": "Redis 分布式锁会遇到哪些问题？",
      "canonical_answer": "需要考虑误删、续约、主从切换一致性等。",
      "category": "distributed_system",
      "difficulty": "medium",
      "tags": ["redis", "lock"],
      "sources": [
        {
          "source_document_id": "src_001",
          "title": "美团后端一面面经"
        }
      ],
      "answer_variants": [
        {
          "id": "ans_001",
          "variant_type": "canonical",
          "content": "需要考虑误删、续约、主从切换一致性等。"
        }
      ],
      "related_questions": []
    }
  }
}
```

## 4.3 PATCH `/api/questions/:questionId`
Update canonical fields.

### Request
```json
{
  "question_text": "Redis 分布式锁常见问题有哪些？",
  "canonical_answer": "...",
  "category": "distributed_system",
  "tags": ["redis", "lock", "high_availability"]
}
```

## 4.4 POST `/api/practice/exams`
Create a 10-question exam session from active questions that already have canonical answers.

### Request
```json
{
  "question_count": 10
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "assessment_session": {
      "id": "exam_001",
      "mode": "exam",
      "status": "active",
      "question_count": 10,
      "total_score": null,
      "max_score": 100
    },
    "items": [
      {
        "id": "exam_item_001",
        "sequence_no": 1,
        "question_item_id": "q_redis_lock_001",
        "question_text": "Redis 分布式锁会遇到哪些问题？",
        "canonical_answer": "需要考虑误删、续约、主从切换一致性等。",
        "category": "distributed_system",
        "tags": ["redis", "lock"],
        "dimension_weights": [
          {
            "key": "distributed_systems",
            "weight": 1
          }
        ],
        "user_answer": null,
        "score": null,
        "max_score": 10
      }
    ]
  }
}
```

### Rules
- Only active questions with `canonical_answer` can be selected.
- The response must already contain stable item ids for later answer submission.
- MVP-2 should resolve fixed-dimension `dimension_weights` from question taxonomy at exam creation time and snapshot them with the item.

## 4.5 GET `/api/practice/exams/:sessionId`
Return exam snapshot, current answers, and scoring result if available.

### Response highlights
- `assessment_session.status`: `active | scoring | completed | failed`
- `items[*].user_answer` is the latest stored answer
- `items[*].dimension_weights[]` is the creation-time fixed-dimension snapshot
- `result_summary` is only present after scoring is completed or failed with fallback summary
- historical MVP-1 sessions may still return legacy `radar_dimensions[]`; newly created V2 sessions return the split radar/profile shape below

## 4.6 POST `/api/practice/exams/:sessionId/submit`
Submit all answers and trigger grading.

### Request
```json
{
  "answers": [
    {
      "assessment_item_id": "exam_item_001",
      "user_answer": "我会先说明误删、续约和主从切换一致性问题。"
    }
  ]
}
```

### Response highlights
- Returns the same `assessment_session` + `items` shape as `GET`.
- `result_summary` 已统一为 V2 结构：
  - `overall_feedback`
  - `weak_areas[]`
  - `exam_radar_dimensions[]`
  - `profile_radar_dimensions[]`
  - `profile_updates[]`
- Each item includes `feedback` and `skill_scores` for result rendering.

### MVP-2 fixed dimension catalog
- `java_fundamentals`
- `database_storage`
- `distributed_systems`
- `computer_fundamentals`
- `system_design_engineering`
- `agent_capability`

### MVP-2 result summary shape
```ts
type PracticeDimensionKey =
  | 'java_fundamentals'
  | 'database_storage'
  | 'distributed_systems'
  | 'computer_fundamentals'
  | 'system_design_engineering'
  | 'agent_capability'

interface PracticeResultSummaryV2 {
  overall_feedback: string
  weak_areas: Array<{
    key: PracticeDimensionKey
    label: string
    question_count: number
    coverage_weight: number
    average_score: number
  }>
  exam_radar_dimensions: Array<{
    key: PracticeDimensionKey
    label: string
    question_count: number
    coverage_weight: number
    average_score: number
  }>
  profile_radar_dimensions: Array<{
    key: PracticeDimensionKey
    label: string
    score: number
    evidence_count: number
    last_assessed_at?: string | null
    covered_in_exam: boolean
  }>
  profile_updates: Array<{
    key: PracticeDimensionKey
    label: string
    previous_score?: number | null
    new_score: number
    exam_score: number
    coverage_weight: number
    update_weight: number
  }>
}
```

Rules:
- `exam_radar_dimensions` only includes dimensions actually covered by the current paper.
- `profile_radar_dimensions` always returns the full fixed catalog.
- `profile_updates` only includes dimensions covered by the current paper and actually updated.

## 4.7 GET `/api/practice/profile`
Return the persisted long-term practice profile.

### Response
```json
{
  "ok": true,
  "data": {
    "profile": {
      "id": "practice_profile_local",
      "scope": "local_default",
      "dimension_catalog_version": "practice-v2",
      "last_exam_session_id": "exam_001",
      "last_assessed_at": "2026-03-31T07:00:00Z"
    },
    "dimensions": [
      {
        "key": "java_fundamentals",
        "label": "Java基础",
        "score": 6.8,
        "evidence_count": 18.5,
        "last_exam_score": 7.2,
        "last_assessed_at": "2026-03-31T07:00:00Z"
      }
    ]
  }
}
```

### Rules
- Service should return the full fixed dimension catalog even before the user has enough evidence.
- Initial profile should default to `score = 0` and `evidence_count = 0`, not `404`.
- 历史考试不会被自动回填到 profile；画像从 V2 上线后的新考试开始累积。

---

## 5. Interview note APIs

## 5.1 GET `/api/interviews`
List interview experiences.

### Query params
- `q?`
- `company?`
- `tag?`
- `page?`
- `page_size?`

## 5.2 GET `/api/interviews/:interviewId`
Return one interview experience with extracted questions.

### Response
```json
{
  "ok": true,
  "data": {
    "interview_experience": {
      "id": "intv_001",
      "company": "美团",
      "role": "后端开发",
      "round_info": "一面",
      "summary": "偏中间件与并发",
      "tags": ["java", "redis", "mq"],
      "questions": [
        {
          "id": "q_redis_lock_001",
          "question_text": "Redis 分布式锁会遇到哪些问题？"
        }
      ]
    }
  }
}
```

---

## 6. Search APIs

## 6.1 GET `/api/search`
Unified search across question / answer / source / project.

### Query params
- `q`: required
- `scope?`: `all | questions | interviews | answers | projects`
- `strategy?`: `fts | hybrid`
- `page?`
- `page_size?`

### Response
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "type": "question",
        "id": "q_redis_lock_001",
        "title": "Redis 分布式锁会遇到哪些问题？",
        "snippet": "需要考虑误删、续约、主从切换一致性等。",
        "score": 0.92,
        "reason": "fts"
      }
    ],
    "facets": {
      "categories": [
        { "name": "distributed_system", "count": 12 }
      ],
      "tags": [
        { "name": "redis", "count": 8 }
      ]
    },
    "page": 1,
    "page_size": 20,
    "total": 1
  }
}
```

Rules:
- `strategy=fts` is available in MVP-1.
- `strategy=hybrid` becomes available in MVP-2 after embeddings are enabled.

---

## 7. RAG retrieval APIs

These are internal-but-first-class APIs because this project is agent-oriented and should expose explainable retrieval contracts.

## 7.1 POST `/api/retrieval/query`
Run retrieval without LLM answer generation.

### Request
```json
{
  "query": "怎么回答 Redis 锁和 RedLock？",
  "query_type": "qa",
  "top_k": 8,
  "strategy": "hybrid"
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "retrieval_log": {
      "id": "ret_001",
      "strategy": "hybrid"
    },
    "hits": [
      {
        "owner_type": "question_item",
        "owner_id": "q_redis_lock_001",
        "chunk_id": "chunk_101",
        "score": 0.92,
        "reason": "merged",
        "snippet": "Redis 分布式锁会遇到哪些问题？"
      }
    ]
  }
}
```

## 7.2 POST `/api/chunks/rebuild`
Rebuild chunks for one owner or whole dataset.

### Request
```json
{
  "owner_type": "question_item",
  "owner_id": "q_redis_lock_001"
}
```

## 7.3 POST `/api/embeddings/rebuild`
Generate embeddings for pending chunks.

### Request
```json
{
  "owner_type": "question_item",
  "owner_id": "q_redis_lock_001"
}
```

MVP note:
- These endpoints may be admin/internal only.
- `POST /api/embeddings/rebuild` is now expected to drive `chunk_embeddings` + Milvus sync state, not persist `vector_json` in SQLite.
- They still deserve stable schemas because agents may call them.

---

## 8. AI QA session APIs

## 8.1 POST `/api/qa/sessions`
Create QA session.

### Request
```json
{
  "title": "Redis / MQ 复习"
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "ai_session": {
      "id": "sess_qa_001",
      "session_type": "qa",
      "status": "active"
    }
  }
}
```

## 8.2 POST `/api/qa/sessions/:sessionId/ask`
Hybrid retrieval + grounded answer.

### Request
```json
{
  "query": "Redis 锁怎么回答比较完整？",
  "top_k": 8,
  "strategy": "hybrid"
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "answer": "回答时建议先讲目标，再讲常见问题：误删、续约、主从切换一致性、超时兜底。",
    "answer_mode": "grounded_answered",
    "support_summary": "lexical 与 vector 都提供了稳定支持，最终收口到 2 个问题上下文和 3 条引用。",
    "citations": [
      {
        "question_item_id": "q_redis_lock_001",
        "label": "Redis 分布式锁会遇到哪些问题？"
      }
    ],
    "related_questions": [
      {
        "id": "q_redlock_001",
        "question_text": "RedLock 是否真的可靠？"
      }
    ],
    "retrieval_log_id": "ret_001",
    "retrieval_summary": {
      "text": "已应用 history-aware rewrite，lexical 命中 6 条、vector 命中 4 条，最终选择 2 个问题上下文和 3 条引用，support=grounded_answered。",
      "rewrite_applied": true,
      "support_level": "grounded_answered",
      "lexical_hits": 6,
      "vector_hits": 4,
      "merged_hits": 9
    },
    "rewrite_applied": true
  }
}
```

Rules:
- This endpoint must always return an `answer`.
- `answer_mode = no_grounded_support` means "the answer is mainly general guidance because local grounding is absent", not "refuse to answer".
- `support_summary` should make the grounding strength explicit without replacing the answer itself.

## 8.3 DELETE `/api/qa/sessions/:sessionId`
Archive a QA session so it disappears from recent-session navigation.

### Response
```json
{
  "ok": true,
  "data": {
    "ai_session": {
      "id": "sess_qa_001",
      "session_type": "qa",
      "status": "archived"
    }
  }
}
```

## 8.4 GET `/api/qa/sessions/:sessionId`
Return session metadata and turns.

---

## 9. Resume / deep dive APIs

## 9.1 POST `/api/resumes/from-source`
Convert a resume source into structured resume_document.

### Request
```json
{
  "source_document_id": "src_resume_001"
}
```

## 9.2 GET `/api/resumes/:resumeId/projects`
List extracted projects.

## 9.3 GET `/api/resume-projects/:projectId`
Project detail.

## 9.4 POST `/api/resume-projects/:projectId/deep-dive-sessions`
Create deep dive session.

### Request
```json
{
  "mode": "resume_deep_dive"
}
```

## 9.5 POST `/api/resume-projects/:projectId/deep-dive-sessions/:sessionId/ask`
Ask / continue multi-turn interviewer session.

### Request
```json
{
  "answer": "我们当时把同步调用改成了异步事件流。"
}
```

### Response
```json
{
  "ok": true,
  "data": {
    "next_question": "为什么要改成异步？当时的瓶颈是什么？",
    "coach_hints": [
      "补充改造前后延迟或吞吐变化",
      "说明一致性与补偿策略"
    ],
    "retrieval_log_id": "ret_201"
  }
}
```

---

## 10. OpenClaw adapter contracts

These are internal service contracts, not necessarily public HTTP endpoints, but should remain stable because agents will depend on them.

## 10.1 Parse contract
```ts
interface OpenClawParseRequest {
  task: 'extract_interview' | 'extract_resume'
  source_document_id: string
  title: string
  raw_text: string
}

interface OpenClawParseResponse {
  result: {
    source_summary?: string
    interview_experience?: {
      company?: string | null
      role?: string | null
      round_info?: string | null
      summary?: string | null
      tags?: string[]
    } | null
    questions: Array<{
      question_text: string
      canonical_answer?: string | null
      source_answer?: string | null
      category?: string | null
      tags?: string[]
      confidence?: number | null
      merge_hint_question_id?: string | null
    }>
    resume_projects?: Array<{
      name: string
      summary?: string | null
      highlights?: string[]
      tech_stack?: string[]
      deep_dive_questions?: string[]
    }>
    warnings?: string[]
  }
}
```

## 10.2 QA contract
```ts
interface OpenClawQaRequest {
  query: string
  session_type: 'qa' | 'resume_deep_dive' | 'mock_interview'
  context_packet: {
    hits: Array<{
      owner_type: string
      owner_id: string
      snippet: string
      score: number
    }>
    related_question_ids?: string[]
    session_history?: Array<{
      role: 'user' | 'assistant'
      content: string
    }>
  }
}

interface OpenClawQaResponse {
  answer: string
  citations?: Array<{
    owner_type: string
    owner_id: string
    label: string
  }>
  related_questions?: Array<{
    id: string
    question_text: string
  }>
}
```

Rules:
- Adapter should not let model invent external citations.
- `citations` should map back to real local entities.
- If retrieval is weak, allow conservative answer + explicit uncertainty.

---

## 11. Error codes

Suggested stable error codes:
- `invalid_request`
- `not_found`
- `conflict`
- `parse_failed`
- `review_required`
- `retrieval_unavailable`
- `provider_timeout`
- `provider_error`
- `internal_error`

---

## 12. Suggested implementation order

If implementing API-first:
1. `/api/sources/text`
2. `/api/sources/upload`
3. `/api/parse-jobs`
4. `/api/parse-jobs/:jobId`
5. `/api/parse-jobs/:jobId/result`
6. `/api/parse-jobs/:jobId/confirm`
7. `/api/questions`
8. `/api/questions/:questionId`
9. `/api/practice/exams`
10. `/api/practice/exams/:sessionId`
11. `/api/practice/exams/:sessionId/submit`
12. `/api/practice/profile`
13. `/api/interviews`
14. `/api/interviews/:interviewId`
15. `/api/search`
16. `/api/retrieval/query`
17. `/api/qa/sessions`
18. `/api/qa/sessions/:sessionId/ask`
19. resume / deep-dive endpoints

---

## 13. MVP boundary notes

### MVP-1 required
- ingestion endpoints
- parse job endpoints
- confirm endpoint
- question / interview list + detail
- `/api/search?strategy=fts`

### MVP-2 required
- `/api/retrieval/query`
- `/api/practice/exams/*`
- `/api/practice/profile`
- chunk + embedding rebuild endpoints
- `/api/qa/sessions/*`
- `/api/search?strategy=hybrid`

### MVP-3 required
- resume + deep-dive endpoints

---

## 14. Non-goals

Not defining yet:
- auth/session login APIs
- multi-tenant ownership
- public share APIs
- spaced repetition APIs
- analytics dashboards
