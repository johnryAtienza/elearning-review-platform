--  MIGRATION: add_quiz_id_to_quiz_results
--  Purpose:
--    1. Persist the submitted problem set / quiz ID with each attempt.
--    2. Backfill existing attempts by matching saved answer question IDs to
--       quiz_questions.quiz_id.
--    3. Expose quiz/problem set titles in get_quiz_history().

ALTER TABLE public.quiz_results
  ADD COLUMN IF NOT EXISTS quiz_id uuid REFERENCES public.quizzes(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.quiz_results.quiz_id IS
  'Problem set / quiz ID that produced this attempt. Nullable for legacy rows until backfilled.';

CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id
  ON public.quiz_results (quiz_id);

WITH inferred_attempt_quizzes AS (
  SELECT
    qr.id,
    MIN(qq.quiz_id::text)::uuid AS quiz_id,
    COUNT(DISTINCT qq.quiz_id) AS quiz_count
  FROM public.quiz_results qr
  JOIN LATERAL jsonb_object_keys(qr.answers) AS answer(question_id_text) ON TRUE
  JOIN public.quiz_questions qq
    ON qq.id::text = answer.question_id_text
  GROUP BY qr.id
)
UPDATE public.quiz_results qr
SET quiz_id = inferred.quiz_id
FROM inferred_attempt_quizzes inferred
WHERE qr.id = inferred.id
  AND qr.quiz_id IS NULL
  AND inferred.quiz_count = 1;

DROP FUNCTION IF EXISTS public.get_quiz_history(int);

CREATE FUNCTION public.get_quiz_history(p_limit int DEFAULT 50)
RETURNS TABLE (
  id            uuid,
  lesson_id     uuid,
  lesson_title  text,
  subject_id    uuid,
  subject_title text,
  quiz_id       uuid,
  quiz_title    text,
  score         int,
  total         int,
  submitted_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qr.id,
    qr.lesson_id,
    l.title       AS lesson_title,
    l.subject_id,
    s.title       AS subject_title,
    q.id          AS quiz_id,
    q.title       AS quiz_title,
    qr.score,
    qr.total,
    qr.submitted_at
  FROM public.quiz_results qr
  JOIN public.lessons  l ON l.id = qr.lesson_id
  JOIN public.subjects s ON s.id = l.subject_id
  LEFT JOIN public.quizzes q ON q.id = qr.quiz_id
  WHERE qr.user_id = auth.uid()
  ORDER BY qr.submitted_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_quiz_history(int) IS
  'Returns the calling user''s quiz attempts (newest first) joined with lesson, subject, and problem set titles.';

GRANT EXECUTE ON FUNCTION public.get_quiz_history(int) TO authenticated;
