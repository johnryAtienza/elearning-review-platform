-- ============================================================
-- MIGRATION: add_lesson_video_presence
--
-- Expose only whether a lesson has a configured video asset. The underlying
-- storage key remains excluded from the student-safe lesson_previews view.
-- This lets the Portal avoid requesting a playback session for empty lessons.
-- ============================================================

DROP VIEW IF EXISTS public.lesson_previews;

CREATE VIEW public.lesson_previews
WITH (security_invoker = false)
AS
  SELECT
    id,
    subject_id,
    title,
    description,
    "order",
    week_number,
    day_number,
    is_free_preview,
    (
      NULLIF(BTRIM(video_url), '') IS NOT NULL
      OR (
        drm_enabled = TRUE
        AND NULLIF(BTRIM(drm_asset_id), '') IS NOT NULL
      )
    ) AS has_video,
    duration,
    duration_minutes,
    created_at
  FROM public.lessons;

COMMENT ON VIEW public.lesson_previews IS
  'Public, premium-safe view of lessons. Excludes video_url and reviewer_pdf_url
   while exposing derived has_video metadata for playback-state rendering.';

GRANT SELECT ON public.lesson_previews TO anon, authenticated;
