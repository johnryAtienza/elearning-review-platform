-- ============================================================
--  MIGRATION: add_saved_courses
--
--  1. saved_courses table — per-user course bookmarks
--  2. RLS policies
--  3. get_saved_courses_progress() — returns watched/total per saved course
--  4. get_dashboard_stats()        — aggregated user metrics
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_courses (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  course_id  UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

COMMENT ON TABLE  public.saved_courses          IS 'Courses bookmarked / added to dashboard by each user';
COMMENT ON COLUMN public.saved_courses.added_at IS 'When the user saved this course';


-- ── 2. Row-Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.saved_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_courses: read own"
  ON public.saved_courses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "saved_courses: insert own"
  ON public.saved_courses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_courses: delete own"
  ON public.saved_courses
  FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. Ensure lesson_progress exists (dependency for step 4) ─────────────────
--
-- lesson_progress is created by add_lesson_progress.sql. This block makes
-- add_saved_courses.sql safe to run standalone or in any order.

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id  TEXT        NOT NULL,
  is_watched BOOLEAN     NOT NULL DEFAULT false,
  watched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lesson_progress' AND policyname = 'Users can read own progress'
  ) THEN
    CREATE POLICY "Users can read own progress"
      ON public.lesson_progress FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lesson_progress' AND policyname = 'Users can insert own progress'
  ) THEN
    CREATE POLICY "Users can insert own progress"
      ON public.lesson_progress FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lesson_progress' AND policyname = 'Users can update own progress'
  ) THEN
    CREATE POLICY "Users can update own progress"
      ON public.lesson_progress FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ── 4. get_saved_courses_progress() ──────────────────────────────────────────
--
-- Returns one row per saved course for the calling user.
-- watched_lessons = lesson_progress rows joined to lessons by course_id
-- total_lessons   = all lessons in that course (published or not)

CREATE OR REPLACE FUNCTION public.get_saved_courses_progress()
RETURNS TABLE (
  course_id       UUID,
  watched_lessons BIGINT,
  total_lessons   BIGINT,
  added_at        TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sc.course_id,
    COALESCE((
      SELECT COUNT(*)
      FROM   lesson_progress lp
      JOIN   lessons          l  ON l.id::text = lp.lesson_id
      WHERE  lp.user_id    = auth.uid()
        AND  l.course_id   = sc.course_id
        AND  lp.is_watched = true
    ), 0)                                                        AS watched_lessons,
    (SELECT COUNT(*) FROM lessons WHERE course_id = sc.course_id) AS total_lessons,
    sc.added_at
  FROM  saved_courses sc
  WHERE sc.user_id = auth.uid()
  ORDER BY sc.added_at DESC;
$$;

COMMENT ON FUNCTION public.get_saved_courses_progress IS
  'Returns saved courses with per-course lesson progress for the calling user.';


-- ── 4. get_dashboard_stats() ──────────────────────────────────────────────────
--
-- Single-call aggregate for the dashboard summary cards.

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'courses_saved',     (SELECT COUNT(*) FROM saved_courses   WHERE user_id = auth.uid()),
    'lessons_completed', (SELECT COUNT(*) FROM lesson_progress WHERE user_id = auth.uid() AND is_watched = true),
    'quizzes_taken',     (SELECT COUNT(*) FROM quiz_results    WHERE user_id = auth.uid())
  );
$$;

COMMENT ON FUNCTION public.get_dashboard_stats IS
  'Returns aggregated dashboard metrics (courses saved, lessons completed, quizzes taken) for the calling user.';
