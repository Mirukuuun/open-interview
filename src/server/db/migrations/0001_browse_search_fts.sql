CREATE VIRTUAL TABLE IF NOT EXISTS question_search USING fts5(
  question_id UNINDEXED,
  question_text,
  canonical_answer,
  tag_text,
  tokenize = 'trigram'
);

CREATE VIRTUAL TABLE IF NOT EXISTS interview_search USING fts5(
  interview_id UNINDEXED,
  company,
  role,
  round_info,
  summary,
  tag_text,
  source_title,
  source_raw_text,
  tokenize = 'trigram'
);

INSERT INTO question_search (
  question_id,
  question_text,
  canonical_answer,
  tag_text
)
SELECT
  q.id,
  q.question_text,
  COALESCE(q.canonical_answer, ''),
  COALESCE((
    SELECT GROUP_CONCAT(t.name, ' ')
    FROM question_tags qt
    INNER JOIN tags t
      ON t.id = qt.tag_id
    WHERE qt.question_item_id = q.id
  ), '')
FROM question_items q
WHERE q.review_status = 'active';

INSERT INTO interview_search (
  interview_id,
  company,
  role,
  round_info,
  summary,
  tag_text,
  source_title,
  source_raw_text
)
SELECT
  i.id,
  COALESCE(i.company, ''),
  COALESCE(i.role, ''),
  COALESCE(i.round_info, ''),
  COALESCE(i.summary, ''),
  COALESCE((
    SELECT GROUP_CONCAT(t.name, ' ')
    FROM interview_tags it
    INNER JOIN tags t
      ON t.id = it.tag_id
    WHERE it.interview_experience_id = i.id
  ), ''),
  COALESCE(sd.title, ''),
  COALESCE(sd.raw_text, '')
FROM interview_experiences i
INNER JOIN source_documents sd
  ON sd.id = i.source_document_id
WHERE i.status = 'active'
  AND sd.status = 'active';
