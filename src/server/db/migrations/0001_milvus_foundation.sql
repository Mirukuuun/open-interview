CREATE TABLE IF NOT EXISTS chunk_embeddings (
  id TEXT PRIMARY KEY NOT NULL,
  chunk_id TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'ready', 'failed')
  ),
  dims INTEGER,
  last_embedded_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS chunk_embeddings_chunk_id_uq
  ON chunk_embeddings (chunk_id);

CREATE INDEX IF NOT EXISTS chunk_embeddings_status_idx
  ON chunk_embeddings (status);

CREATE INDEX IF NOT EXISTS chunk_embeddings_provider_model_idx
  ON chunk_embeddings (provider, model);

CREATE TABLE IF NOT EXISTS chunk_vector_sync_states (
  id TEXT PRIMARY KEY NOT NULL,
  chunk_id TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  backend TEXT NOT NULL DEFAULT 'milvus' CHECK (
    backend IN ('milvus')
  ),
  collection_name TEXT NOT NULL,
  document_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    sync_status IN ('pending', 'synced', 'failed')
  ),
  last_synced_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS chunk_vector_sync_states_chunk_backend_uq
  ON chunk_vector_sync_states (chunk_id, backend);

CREATE INDEX IF NOT EXISTS chunk_vector_sync_states_status_idx
  ON chunk_vector_sync_states (sync_status);

CREATE INDEX IF NOT EXISTS chunk_vector_sync_states_collection_idx
  ON chunk_vector_sync_states (collection_name);

CREATE TABLE IF NOT EXISTS vector_sync_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  backend TEXT NOT NULL DEFAULT 'milvus' CHECK (
    backend IN ('milvus')
  ),
  job_type TEXT NOT NULL CHECK (
    job_type IN ('backfill', 'delete_chunk', 'rebuild')
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'completed', 'failed')
  ),
  collection_name TEXT NOT NULL,
  target_chunk_id TEXT,
  target_owner_type TEXT CHECK (
    target_owner_type IN ('source_document', 'question_item', 'answer_variant', 'resume_project')
  ),
  target_owner_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vector_sync_jobs_status_idx
  ON vector_sync_jobs (status);

CREATE INDEX IF NOT EXISTS vector_sync_jobs_backend_idx
  ON vector_sync_jobs (backend);

CREATE INDEX IF NOT EXISTS vector_sync_jobs_type_idx
  ON vector_sync_jobs (job_type);

CREATE INDEX IF NOT EXISTS vector_sync_jobs_chunk_idx
  ON vector_sync_jobs (target_chunk_id);
