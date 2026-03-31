CREATE TABLE IF NOT EXISTS assessment_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  mode TEXT NOT NULL DEFAULT 'exam' CHECK (
    mode IN ('exam')
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'scoring', 'completed', 'failed')
  ),
  question_count INTEGER NOT NULL,
  total_score INTEGER,
  max_score INTEGER NOT NULL DEFAULT 100,
  summary_json TEXT,
  scoring_provider TEXT NOT NULL DEFAULT 'openclaw' CHECK (
    scoring_provider IN ('openclaw')
  ),
  started_at TEXT NOT NULL,
  submitted_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS assessment_sessions_mode_idx
  ON assessment_sessions (mode);

CREATE INDEX IF NOT EXISTS assessment_sessions_status_idx
  ON assessment_sessions (status);

CREATE INDEX IF NOT EXISTS assessment_sessions_updated_at_idx
  ON assessment_sessions (updated_at);

CREATE TABLE IF NOT EXISTS assessment_items (
  id TEXT PRIMARY KEY NOT NULL,
  assessment_session_id TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_item_id TEXT NOT NULL REFERENCES question_items(id),
  sequence_no INTEGER NOT NULL,
  question_text_snapshot TEXT NOT NULL,
  canonical_answer_snapshot TEXT,
  category_snapshot TEXT,
  difficulty_snapshot TEXT CHECK (
    difficulty_snapshot IS NULL OR difficulty_snapshot IN ('easy', 'medium', 'hard')
  ),
  tags_json TEXT NOT NULL DEFAULT '[]',
  user_answer TEXT,
  score INTEGER,
  max_score INTEGER NOT NULL DEFAULT 10,
  feedback_json TEXT,
  skill_scores_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS assessment_items_session_sequence_uq
  ON assessment_items (assessment_session_id, sequence_no);

CREATE INDEX IF NOT EXISTS assessment_items_session_idx
  ON assessment_items (assessment_session_id, sequence_no);

CREATE INDEX IF NOT EXISTS assessment_items_question_idx
  ON assessment_items (question_item_id);
