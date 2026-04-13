-- Add optional description field to quizzes
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS description TEXT;
