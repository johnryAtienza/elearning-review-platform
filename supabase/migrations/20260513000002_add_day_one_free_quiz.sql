-- ============================================================
--  MIGRATION: add_day_one_free_quiz
--
--  Implements the "Day 1 is free" rule on the quizzes table:
--  any authenticated user (not just subscribers) can SELECT
--  quiz rows whose parent lesson has day_number = 1.
--
--  Subscribers continue to read every quiz row. Admins continue
--  to read everything via the existing "quizzes: admin reads all"
--  policy. Write policies (admin insert/update/delete) untouched.
--
--  Depends on: add_lesson_week_day.sql (which adds lessons.day_number).
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- Drop the existing subscriber-only SELECT policy and replace it with
-- one that ALSO grants access when the lesson is Day 1.
DROP POLICY IF EXISTS "quizzes: subscribed users read" ON public.quizzes;

CREATE POLICY "quizzes: subscribed or day-1 free"
  ON public.quizzes
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      public.is_active_subscriber(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.lessons l
        WHERE l.id = quizzes.lesson_id
          AND l.day_number = 1
      )
    )
  );

COMMENT ON POLICY "quizzes: subscribed or day-1 free" ON public.quizzes IS
  'Authenticated users can read quizzes when they are an active subscriber
   OR when the parent lesson is Day 1 (free for everyone).';
