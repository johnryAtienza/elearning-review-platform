-- Add answer explanation fields to quiz_questions
-- A question can have: text only, image only, or both.

ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS answer_text      TEXT,
  ADD COLUMN IF NOT EXISTS answer_image_url TEXT;
