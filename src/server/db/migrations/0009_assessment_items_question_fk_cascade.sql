-- Add ON DELETE CASCADE to assessment_items.question_item_id FK.
-- SQLite requires table rebuild to alter foreign key constraints.

PRAGMA foreign_keys = OFF;

CREATE TABLE assessment_items_new (
  id TEXT PRIMARY KEY NOT NULL,
  assessment_session_id TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_item_id TEXT NOT NULL REFERENCES question_items(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  question_text_snapshot TEXT NOT NULL,
  canonical_answer_snapshot TEXT,
  category_snapshot TEXT,
  difficulty_snapshot TEXT CHECK (
    difficulty_snapshot IS NULL OR difficulty_snapshot IN ('easy', 'medium', 'hard')
  ),
  tags_json TEXT NOT NULL DEFAULT '[]',
  dimension_weights_json TEXT,
  user_answer TEXT,
  score INTEGER,
  max_score INTEGER NOT NULL DEFAULT 10,
  feedback_json TEXT,
  skill_scores_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO assessment_items_new (
  id, assessment_session_id, question_item_id, sequence_no,
  question_text_snapshot, canonical_answer_snapshot, category_snapshot,
  difficulty_snapshot, tags_json, dimension_weights_json,
  user_answer, score, max_score, feedback_json, skill_scores_json,
  created_at, updated_at
)
SELECT
  id, assessment_session_id, question_item_id, sequence_no,
  question_text_snapshot, canonical_answer_snapshot, category_snapshot,
  difficulty_snapshot, tags_json, dimension_weights_json,
  user_answer, score, max_score, feedback_json, skill_scores_json,
  created_at, updated_at
FROM assessment_items;

DROP TABLE assessment_items;

ALTER TABLE assessment_items_new RENAME TO assessment_items;

CREATE UNIQUE INDEX assessment_items_session_sequence_uq
  ON assessment_items (assessment_session_id, sequence_no);

CREATE INDEX assessment_items_session_idx
  ON assessment_items (assessment_session_id, sequence_no);

CREATE INDEX assessment_items_question_idx
  ON assessment_items (question_item_id);

PRAGMA foreign_keys = ON;
