-- ============================================================
--  MIGRATION: quiz_results_history
--
--  1. Drop the UNIQUE (user_id, lesson_id) constraint so every
--     quiz submission is recorded as its own row (full history,
--     including retries).
--  2. Replace the INSERT RLS policy so that, in addition to active
--     subscribers, any authenticated user can save a result for a
--     Day-1 (free) lesson.
--  3. Add get_quiz_history() RPC that returns the calling user's
--     attempts joined with lesson + course titles.
--
--  Depends on:
--    - schema.sql (quiz_results table + initial RLS)
--    - add_lesson_week_day.sql (lessons.day_number)
--    - 20260513000002_add_day_one_free_quiz.sql (Day-1 read policy)
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. Drop UNIQUE so every attempt becomes its own row ─────────────
ALTER TABLE public.quiz_results
  DROP CONSTRAINT IF EXISTS quiz_results_user_id_lesson_id_key;


-- ── 2. Replace INSERT policy ────────────────────────────────────────
DROP POLICY IF EXISTS "quiz_results: subscribed users insert" ON public.quiz_results;

CREATE POLICY "quiz_results: subscribed or day-1 free insert"
  ON public.quiz_results
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_active_subscriber(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.lessons l
        WHERE l.id = quiz_results.lesson_id
          AND l.day_number = 1
      )
    )
  );

COMMENT ON POLICY "quiz_results: subscribed or day-1 free insert" ON public.quiz_results IS
  'Authenticated users can save a quiz result when they are an active subscriber
   OR when the parent lesson is Day 1 (free for everyone). user_id is pinned to auth.uid().';


-- ── 3. get_quiz_history() RPC ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_quiz_history(p_limit int DEFAULT 50)
RETURNS TABLE (
  id           uuid,
  lesson_id    uuid,
  lesson_title text,
  course_id    uuid,
  course_title text,
  score        int,
  total        int,
  submitted_at timestamptz
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
    l.course_id,
    c.title       AS course_title,
    qr.score,
    qr.total,
    qr.submitted_at
  FROM public.quiz_results qr
  JOIN public.lessons l ON l.id = qr.lesson_id
  JOIN public.courses c ON c.id = l.course_id
  WHERE qr.user_id = auth.uid()
  ORDER BY qr.submitted_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_quiz_history(int) IS
  'Returns the calling user''s quiz attempts (newest first) joined with lesson and course titles.';
