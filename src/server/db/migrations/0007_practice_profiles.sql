ALTER TABLE assessment_items
  ADD COLUMN dimension_weights_json TEXT;

CREATE TABLE IF NOT EXISTS practice_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  scope TEXT NOT NULL,
  dimension_catalog_version TEXT NOT NULL,
  last_exam_session_id TEXT,
  last_assessed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS practice_profiles_scope_uq
  ON practice_profiles (scope);

CREATE TABLE IF NOT EXISTS practice_profile_dimensions (
  id TEXT PRIMARY KEY NOT NULL,
  practice_profile_id TEXT NOT NULL REFERENCES practice_profiles(id) ON DELETE CASCADE,
  dimension_key TEXT NOT NULL CHECK (
    dimension_key IN (
      'java_fundamentals',
      'database_storage',
      'distributed_systems',
      'computer_fundamentals',
      'system_design_engineering',
      'agent_capability'
    )
  ),
  score REAL NOT NULL DEFAULT 0,
  evidence_count REAL NOT NULL DEFAULT 0,
  last_exam_score REAL,
  last_coverage_weight REAL,
  last_assessed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS practice_profile_dimensions_profile_dimension_uq
  ON practice_profile_dimensions (practice_profile_id, dimension_key);

CREATE INDEX IF NOT EXISTS practice_profile_dimensions_profile_idx
  ON practice_profile_dimensions (practice_profile_id, dimension_key);
