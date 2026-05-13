-- ============================================================
--  MIGRATION: add_lesson_week_day
--
--  Adds week_number + day_number columns to the lessons table so
--  the curriculum can be displayed as a Week → Day grid (per the
--  CLASS S wireframe) and so the "Day 1 free access" rule can be
--  enforced based on a real column instead of client-side guessing.
--
--  Backfill rule (default for v1): 6 days per week
--    week_number = ceil("order" / 6)
--    day_number  = "order"
--
--  Admins can correct per-lesson values via the LessonModal form
--  after the migration runs.
--
--  Also recreates lesson_previews view to expose both new columns
--  to non-subscribers (so the Day 1 free rule can be checked from
--  the client without exposing premium URLs).
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. Add the columns (nullable — existing rows will be backfilled below) ──
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS week_number integer,
  ADD COLUMN IF NOT EXISTS day_number  integer;

COMMENT ON COLUMN public.lessons.week_number IS
  'Curriculum week (1-based). Default backfill: ceil(order / 6).';
COMMENT ON COLUMN public.lessons.day_number IS
  'Curriculum day (1-based, sequential within the course). Default backfill: equal to "order".
   Day 1 lessons are free for all authenticated users (subscription bypassed).';


-- ── 2. Backfill existing rows ──────────────────────────────────────────────
--   week = ceil(order / 6)
--   day  = order
--   Only touches rows where the new columns are NULL so re-running is safe.
UPDATE public.lessons
SET
  week_number = COALESCE(week_number, GREATEST(1, ((CASE WHEN "order" IS NULL THEN 1 ELSE "order" END) + 5) / 6)),
  day_number  = COALESCE(day_number,  CASE WHEN "order" IS NULL THEN 1 ELSE "order" END)
WHERE week_number IS NULL
   OR day_number  IS NULL;


-- ── 3. Index for week/day-ordered retrieval ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lessons_course_week_day
  ON public.lessons (course_id, week_number, day_number);


-- ── 4. Recreate lesson_previews to expose week_number + day_number ─────────
--   The view is queried by ALL authenticated users (free tier included).
--   We expose week_number + day_number so the client can:
--     - render the Week → Day curriculum grid (CourseDetailPage)
--     - decide whether a lesson is Day 1 (and therefore fully unlocked
--       regardless of subscription tier)
--   Premium URLs (video_url, reviewer_pdf_url) remain excluded.
DROP VIEW IF EXISTS public.lesson_previews;

CREATE VIEW public.lesson_previews
WITH (security_invoker = true)
AS
  SELECT
    id,
    course_id,
    title,
    description,
    "order",
    week_number,
    day_number,
    duration,
    duration_minutes,
    created_at
  FROM public.lessons
  WHERE auth.uid() IS NOT NULL;

COMMENT ON VIEW public.lesson_previews IS
  'Read-only, premium-safe view of lessons. Excludes video_url and reviewer_pdf_url.
   Includes week_number and day_number so the client can render the curriculum grid
   and apply the Day 1 free-access rule.';
