CREATE TABLE IF NOT EXISTS ai_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  session_type TEXT NOT NULL CHECK (
    session_type IN ('qa', 'resume_deep_dive', 'mock_interview')
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'completed', 'archived')
  ),
  related_resume_project_id TEXT,
  provider TEXT NOT NULL DEFAULT 'openclaw' CHECK (provider IN ('openclaw')),
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_sessions_session_type_idx
  ON ai_sessions (session_type);

CREATE INDEX IF NOT EXISTS ai_sessions_status_idx
  ON ai_sessions (status);

CREATE INDEX IF NOT EXISTS ai_sessions_updated_at_idx
  ON ai_sessions (updated_at);

CREATE TABLE IF NOT EXISTS session_turns (
  id TEXT PRIMARY KEY NOT NULL,
  ai_session_id TEXT NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations_json TEXT,
  retrieval_log_id TEXT REFERENCES retrieval_logs(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS session_turns_ai_session_idx
  ON session_turns (ai_session_id, created_at);

CREATE INDEX IF NOT EXISTS session_turns_retrieval_log_idx
  ON session_turns (retrieval_log_id);
