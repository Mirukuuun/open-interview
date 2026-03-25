CREATE TABLE IF NOT EXISTS question_categories (
  question_item_id TEXT NOT NULL REFERENCES question_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  PRIMARY KEY (question_item_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS question_categories_normalized_name_idx
  ON question_categories (normalized_name);
