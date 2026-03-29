ALTER TABLE session_turns
  ADD COLUMN answer_mode TEXT CHECK (
    answer_mode IN ('grounded_answered', 'weak_support', 'no_grounded_support')
  );

ALTER TABLE session_turns
  ADD COLUMN support_summary TEXT;
