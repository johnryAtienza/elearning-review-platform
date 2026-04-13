-- ============================================================
--  MIGRATION: add_lesson_duration_minutes
--
--  Adds duration_minutes (integer) to the lessons table so
--  admins can set a precise lesson length. Updates the
--  lesson_previews view to expose the column.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. Add the column (nullable — existing lessons have no duration set)
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- 2. Recreate lesson_previews to include duration_minutes
--    Must DROP first because CREATE OR REPLACE cannot reorder/insert columns.
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
    duration,
    duration_minutes,
    created_at
  FROM public.lessons
  WHERE auth.uid() IS NOT NULL;

COMMENT ON VIEW public.lesson_previews IS
  'Read-only, premium-safe view of lessons. Excludes video_url and reviewer_pdf_url.
   Use this for course detail pages shown to non-subscribed users.';
