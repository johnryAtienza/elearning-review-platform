-- ============================================================
-- MIGRATION: add_lesson_solution_pdfs
--
-- A lesson may have one private solution PDF associated with an existing book.
-- The storage key is kept on the private lessons table; lesson_previews exposes
-- only the metadata needed to render the Subject Hub section.
-- ============================================================

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS solution_book_id uuid
    REFERENCES public.books(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS solution_pdf_url text;

CREATE INDEX IF NOT EXISTS idx_lessons_solution_book_day
  ON public.lessons (subject_id, solution_book_id, week_number, day_number, "order")
  WHERE solution_book_id IS NOT NULL AND NULLIF(BTRIM(solution_pdf_url), '') IS NOT NULL;

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
    l.created_at
  FROM public.lessons AS l
  LEFT JOIN public.books AS b ON b.id = l.solution_book_id;

COMMENT ON VIEW public.lesson_previews IS
  'Public, premium-safe view of lessons. Excludes video_url, reviewer_pdf_url,
   and solution_pdf_url while exposing derived asset and book metadata.';

GRANT SELECT ON public.lesson_previews TO anon, authenticated;
