CREATE TABLE IF NOT EXISTS interview_questions (
  id TEXT PRIMARY KEY NOT NULL,
  interview_experience_id TEXT NOT NULL REFERENCES interview_experiences(id) ON DELETE CASCADE,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  normalized_question_text TEXT NOT NULL,
  source_answer TEXT,
  source_snippet TEXT,
  source_order INTEGER,
  category TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS interview_questions_interview_idx
  ON interview_questions (interview_experience_id, source_order);

CREATE INDEX IF NOT EXISTS interview_questions_source_document_idx
  ON interview_questions (source_document_id);

CREATE INDEX IF NOT EXISTS interview_questions_normalized_question_text_idx
  ON interview_questions (normalized_question_text);

CREATE TABLE IF NOT EXISTS interview_question_tags (
  interview_question_id TEXT NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (interview_question_id, tag_id)
);

CREATE INDEX IF NOT EXISTS interview_question_tags_tag_idx
  ON interview_question_tags (tag_id);

CREATE TABLE IF NOT EXISTS interview_question_links (
  id TEXT PRIMARY KEY NOT NULL,
  interview_question_id TEXT NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  question_item_id TEXT NOT NULL REFERENCES question_items(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (
    link_type IN ('promoted_create', 'promoted_merge')
  ),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS interview_question_links_uq
  ON interview_question_links (interview_question_id, question_item_id, link_type);

CREATE INDEX IF NOT EXISTS interview_question_links_interview_question_idx
  ON interview_question_links (interview_question_id);

CREATE INDEX IF NOT EXISTS interview_question_links_question_item_idx
  ON interview_question_links (question_item_id);
