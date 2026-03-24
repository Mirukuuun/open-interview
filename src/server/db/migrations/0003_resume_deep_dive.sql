CREATE TABLE IF NOT EXISTS resume_documents (
  id TEXT PRIMARY KEY NOT NULL,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  candidate_name TEXT,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS resume_documents_source_document_id_uq
  ON resume_documents (source_document_id);

CREATE INDEX IF NOT EXISTS resume_documents_updated_at_idx
  ON resume_documents (updated_at);

CREATE TABLE IF NOT EXISTS resume_projects (
  id TEXT PRIMARY KEY NOT NULL,
  resume_document_id TEXT NOT NULL REFERENCES resume_documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  summary TEXT,
  highlights_json TEXT,
  tech_stack_json TEXT,
  deep_dive_questions_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS resume_projects_resume_document_idx
  ON resume_projects (resume_document_id);

CREATE INDEX IF NOT EXISTS resume_projects_name_idx
  ON resume_projects (name);

CREATE INDEX IF NOT EXISTS resume_projects_updated_at_idx
  ON resume_projects (updated_at);

CREATE INDEX IF NOT EXISTS ai_sessions_related_resume_project_idx
  ON ai_sessions (related_resume_project_id, updated_at);
