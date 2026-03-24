CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN ('interview_experience', 'knowledge_note', 'resume', 'manual_input')
  ),
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  file_path TEXT,
  source_url TEXT,
  language TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  parse_status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    parse_status IN (
      'not_started',
      'pending',
      'running',
      'needs_review',
      'confirmed',
      'failed'
    )
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS source_documents_kind_idx
  ON source_documents (kind);

CREATE INDEX IF NOT EXISTS source_documents_parse_status_idx
  ON source_documents (parse_status);

CREATE INDEX IF NOT EXISTS source_documents_status_idx
  ON source_documents (status);

CREATE TABLE IF NOT EXISTS parse_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (
    job_type IN ('extract_interview', 'extract_resume', 'normalize_manual_input')
  ),
  provider TEXT NOT NULL DEFAULT 'openclaw' CHECK (provider IN ('openclaw')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'success', 'failed', 'needs_review', 'confirmed')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  prompt_version TEXT,
  error_message TEXT,
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS parse_jobs_source_document_idx
  ON parse_jobs (source_document_id);

CREATE INDEX IF NOT EXISTS parse_jobs_status_idx
  ON parse_jobs (status);

CREATE INDEX IF NOT EXISTS parse_jobs_created_at_idx
  ON parse_jobs (created_at);

CREATE TABLE IF NOT EXISTS question_items (
  id TEXT PRIMARY KEY NOT NULL,
  question_text TEXT NOT NULL,
  normalized_question_text TEXT NOT NULL,
  canonical_answer TEXT,
  category TEXT,
  difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard')),
  source_count INTEGER NOT NULL DEFAULT 0,
  answer_variant_count INTEGER NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    review_status IN ('draft', 'active', 'archived')
  ),
  created_from TEXT NOT NULL DEFAULT 'manual' CHECK (
    created_from IN ('ai_parse', 'manual')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS question_items_normalized_question_text_uq
  ON question_items (normalized_question_text);

CREATE INDEX IF NOT EXISTS question_items_category_idx
  ON question_items (category);

CREATE INDEX IF NOT EXISTS question_items_review_status_idx
  ON question_items (review_status);

CREATE INDEX IF NOT EXISTS question_items_updated_at_idx
  ON question_items (updated_at);

CREATE TABLE IF NOT EXISTS answer_variants (
  id TEXT PRIMARY KEY NOT NULL,
  question_item_id TEXT NOT NULL REFERENCES question_items(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL CHECK (
    variant_type IN ('canonical', 'personal', 'concise', 'deep_dive', 'follow_up')
  ),
  content TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('user', 'ai', 'system')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS answer_variants_question_item_idx
  ON answer_variants (question_item_id);

CREATE INDEX IF NOT EXISTS answer_variants_variant_type_idx
  ON answer_variants (variant_type);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  tag_type TEXT NOT NULL DEFAULT 'custom' CHECK (
    tag_type IN ('topic', 'company', 'role', 'skill', 'custom')
  ),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_normalized_name_uq
  ON tags (normalized_name);

CREATE INDEX IF NOT EXISTS tags_tag_type_idx
  ON tags (tag_type);

CREATE TABLE IF NOT EXISTS question_tags (
  question_item_id TEXT NOT NULL REFERENCES question_items(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS question_tags_tag_idx
  ON question_tags (tag_id);

CREATE TABLE IF NOT EXISTS source_question_refs (
  id TEXT PRIMARY KEY NOT NULL,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  question_item_id TEXT NOT NULL REFERENCES question_items(id) ON DELETE CASCADE,
  source_snippet TEXT,
  source_order INTEGER,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS source_question_refs_source_question_uq
  ON source_question_refs (source_document_id, question_item_id);

CREATE INDEX IF NOT EXISTS source_question_refs_question_item_idx
  ON source_question_refs (question_item_id);

CREATE INDEX IF NOT EXISTS source_question_refs_source_order_idx
  ON source_question_refs (source_order);

CREATE TABLE IF NOT EXISTS interview_experiences (
  id TEXT PRIMARY KEY NOT NULL,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  company TEXT,
  role TEXT,
  round_info TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS interview_experiences_source_document_id_uq
  ON interview_experiences (source_document_id);

CREATE INDEX IF NOT EXISTS interview_experiences_company_idx
  ON interview_experiences (company);

CREATE INDEX IF NOT EXISTS interview_experiences_updated_at_idx
  ON interview_experiences (updated_at);

CREATE TABLE IF NOT EXISTS interview_tags (
  interview_experience_id TEXT NOT NULL REFERENCES interview_experiences(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (interview_experience_id, tag_id)
);

CREATE INDEX IF NOT EXISTS interview_tags_tag_idx
  ON interview_tags (tag_id);

-- 当前先落结构化 retrieval 表；FTS5 virtual tables
-- 有意延后到 browse/search slice。
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY NOT NULL,
  owner_type TEXT NOT NULL CHECK (
    owner_type IN ('source_document', 'question_item', 'answer_variant', 'resume_project')
  ),
  owner_id TEXT NOT NULL,
  chunk_type TEXT NOT NULL CHECK (
    chunk_type IN ('source_excerpt', 'question', 'answer', 'project_summary')
  ),
  content TEXT NOT NULL,
  token_count INTEGER,
  source_order INTEGER,
  embedding_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    embedding_status IN ('pending', 'ready', 'failed')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_owner_idx
  ON chunks (owner_type, owner_id);

CREATE INDEX IF NOT EXISTS chunks_embedding_status_idx
  ON chunks (embedding_status);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY NOT NULL,
  chunk_id TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  vector_json TEXT NOT NULL,
  dims INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS embeddings_chunk_id_uq
  ON embeddings (chunk_id);

CREATE TABLE IF NOT EXISTS retrieval_logs (
  id TEXT PRIMARY KEY NOT NULL,
  query_text TEXT NOT NULL,
  query_type TEXT NOT NULL CHECK (
    query_type IN ('qa', 'resume_deep_dive', 'mock_interview')
  ),
  strategy TEXT NOT NULL CHECK (strategy IN ('fts', 'vector', 'hybrid')),
  hits_json TEXT NOT NULL,
  final_context_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS retrieval_logs_query_type_idx
  ON retrieval_logs (query_type);

CREATE INDEX IF NOT EXISTS retrieval_logs_strategy_idx
  ON retrieval_logs (strategy);
