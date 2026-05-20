-- ============================================================
--  MIGRATION: quiz_questions_day_one_free
--
--  Mirrors the Day-1-free rule from add_day_one_free_quiz.sql
--  onto the quiz_questions table. Without this, free-tier users
--  can read the parent quizzes row for a Day 1 lesson but get an
--  empty quiz_questions result set, so the UI renders
--  "Question 1 of 0".
--
--  Depends on:
--    - fix_security_advisor.sql (creates the base policy)
--    - add_day_one_free_quiz.sql (introduces the Day 1 pattern)
--    - add_lesson_week_day.sql (adds lessons.day_number)
-- ============================================================

DROP POLICY IF EXISTS "quiz_questions: subscribed users read" ON public.quiz_questions;

CREATE POLICY "quiz_questions: subscribed or day-1 free"
  ON public.quiz_questions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      public.is_active_subscriber(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.lessons l ON l.id = q.lesson_id
        WHERE q.id = quiz_questions.quiz_id
          AND l.day_number = 1
      )
    )
  );

COMMENT ON POLICY "quiz_questions: subscribed or day-1 free" ON public.quiz_questions IS
  'Authenticated users can read quiz_questions when they are an active subscriber
   OR when the parent quiz belongs to a Day 1 lesson (free for everyone).';
