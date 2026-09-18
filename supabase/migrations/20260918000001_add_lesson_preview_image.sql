-- ============================================================
-- MIGRATION: add_lesson_preview_image
--
-- Adds an optional public image for the Curriculum Day hover preview.
-- The storage key remains on lessons, while the student-safe view exposes
-- only this non-sensitive display asset alongside existing lesson metadata.
-- ============================================================

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS preview_image_url text;

COMMENT ON COLUMN public.lessons.preview_image_url IS
  'Optional public lesson image used by the Curriculum Day hover preview.';

DROP VIEW IF EXISTS public.lesson_previews;

CREATE VIEW public.lesson_previews
WITH (security_invoker = false)
AS
  SELECT
    l.id,
    l.subject_id,
    l.title,
    l.description,
    l."order",
    l.week_number,
    l.day_number,
    l.is_free_preview,
    (
      NULLIF(BTRIM(l.video_url), '') IS NOT NULL
      OR (
        l.drm_enabled = TRUE
        AND NULLIF(BTRIM(l.drm_asset_id), '') IS NOT NULL
      )
    ) AS has_video,
    (
      NULLIF(BTRIM(l.solution_pdf_url), '') IS NOT NULL
    ) AS has_solution_pdf,
    l.solution_book_id,
    b.title AS solution_book_title,
    l.duration,
    l.duration_minutes,
    l.preview_image_url,
    l.created_at
  FROM public.lessons AS l
  LEFT JOIN public.books AS b ON b.id = l.solution_book_id;

COMMENT ON VIEW public.lesson_previews IS
  'Public, premium-safe view of lessons. Excludes video_url, reviewer_pdf_url,
   and solution_pdf_url while exposing curriculum metadata and optional preview image.';

GRANT SELECT ON public.lesson_previews TO anon, authenticated;
