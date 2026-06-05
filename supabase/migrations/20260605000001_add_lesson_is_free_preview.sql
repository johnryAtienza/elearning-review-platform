-- ============================================================
--  MIGRATION: add_lesson_is_free_preview
--
--  Replace the hardcoded "Day 1 is free" rule with a per-lesson
--  is_free_preview flag. This unlocks two product changes:
--
--    1. Guests (not logged in) can now watch flagged lessons —
--       previously, Day 1 free required an authenticated user.
--    2. The marketing team can configure multiple preview lessons,
--       entire promo modules, or different preview configurations
--       per course without code changes.
--
--  Backfill sets is_free_preview = TRUE on every lesson where
--  day_number = 1, preserving current behavior bit-for-bit for
--  existing courses. New lessons default to FALSE.
--
--  Existing quiz / quiz_questions / quiz_results RLS policies key
--  on `day_number = 1`. We swap them to key on `is_free_preview`
--  in the same migration so the source of truth is consistent
--  across the schema. Because of the backfill, this is a no-op
--  for current data — the policies behave identically.
--
--  The lesson_previews view (security_invoker = false, granted
--  to anon + authenticated) is recreated with the new column so
--  guest curriculum browsing can read it.
--
--  Depends on:
--    - schema.sql (lessons, quizzes, quiz_questions, quiz_results)
--    - add_lesson_week_day.sql (lessons.day_number)
--    - 20260513000002_add_day_one_free_quiz.sql
--    - 20260518000001_open_lesson_previews_to_public.sql
--    - 20260520000001_quiz_questions_day_one_free.sql
--    - 20260520000002_quiz_results_history.sql
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. Add the column + backfill ────────────────────────────────────
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.lessons
   SET is_free_preview = TRUE
 WHERE day_number = 1
   AND is_free_preview = FALSE;

CREATE INDEX IF NOT EXISTS lessons_is_free_preview_idx
  ON public.lessons (is_free_preview) WHERE is_free_preview = TRUE;

COMMENT ON COLUMN public.lessons.is_free_preview IS
  'When TRUE, the lesson is accessible without a subscription — guests and
   authenticated free-tier users can fetch its signed video/PDF URLs through
   the get-signed-urls Edge Function. Authoritative source for free preview
   access. Replaces the legacy day_number = 1 rule.';


-- ── 2. Recreate lesson_previews to expose the column ────────────────
DROP VIEW IF EXISTS public.lesson_previews;

CREATE VIEW public.lesson_previews
WITH (security_invoker = false)
AS
  SELECT
    id,
    course_id,
    title,
    description,
    "order",
    week_number,
    day_number,
    is_free_preview,
    duration,
    duration_minutes,
    created_at
  FROM public.lessons;

COMMENT ON VIEW public.lesson_previews IS
  'Public, premium-safe view of lessons. Excludes video_url and reviewer_pdf_url.
   Readable by anon and authenticated roles so guests can browse the curriculum
   and identify free-preview lessons on public course detail and lesson pages.';

GRANT SELECT ON public.lesson_previews TO anon, authenticated;


-- ── 3. Swap RLS policies from day_number = 1 → is_free_preview ──────

-- quizzes — readable by subscribers on any lesson, and by EVERYONE
-- (anon included) when the parent lesson is is_free_preview. Guests need
-- this so they can take the quiz on a free preview lesson.
DROP POLICY IF EXISTS "quizzes: subscribed or day-1 free" ON public.quizzes;

CREATE POLICY "quizzes: subscribed or free-preview"
  ON public.quizzes
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND public.is_active_subscriber(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = quizzes.lesson_id
        AND l.is_free_preview = TRUE
    )
  );

COMMENT ON POLICY "quizzes: subscribed or free-preview" ON public.quizzes IS
  'Active subscribers can read every quiz. Anyone (including anon guests) can
   read quizzes whose parent lesson is flagged is_free_preview = TRUE.';


-- quiz_questions — mirrors quizzes. Guests need access on preview lessons so
-- the QuizComponent can render the question list.
DROP POLICY IF EXISTS "quiz_questions: subscribed or day-1 free" ON public.quiz_questions;

CREATE POLICY "quiz_questions: subscribed or free-preview"
  ON public.quiz_questions
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND public.is_active_subscriber(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      WHERE q.id = quiz_questions.quiz_id
        AND l.is_free_preview = TRUE
    )
  );

COMMENT ON POLICY "quiz_questions: subscribed or free-preview" ON public.quiz_questions IS
  'Active subscribers can read every quiz_question. Anyone (including anon
   guests) can read quiz_questions whose parent quiz belongs to an
   is_free_preview lesson.';


-- quiz_results (INSERT)
DROP POLICY IF EXISTS "quiz_results: subscribed or day-1 free insert" ON public.quiz_results;

CREATE POLICY "quiz_results: subscribed or free-preview insert"
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
          AND l.is_free_preview = TRUE
      )
    )
  );

COMMENT ON POLICY "quiz_results: subscribed or free-preview insert" ON public.quiz_results IS
  'Authenticated users can save a quiz result when they are an active subscriber
   OR when the parent lesson is flagged is_free_preview = TRUE. user_id is pinned to auth.uid().';
