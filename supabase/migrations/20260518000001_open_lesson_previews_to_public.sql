-- ============================================================
--  Open lesson_previews to anonymous (guest) clients
--
--  Why:
--    Course detail and lesson pages are now publicly browsable.
--    The previous view definition gated rows on
--      WHERE auth.uid() IS NOT NULL
--    which returned zero rows to anon clients, so guests saw an
--    empty curriculum on every course.
--
--  How:
--    Recreate lesson_previews with security_invoker = false so it
--    runs as the view owner. The view's SELECT list is the
--    redaction boundary — it intentionally excludes video_url and
--    reviewer_pdf_url, so premium content cannot leak through it.
--    The underlying public.lessons table keeps its existing RLS
--    (no anon policy), so direct from('lessons') queries by an
--    anon client still return zero rows.
--
--  Trade-off:
--    fix_security_advisor.sql previously flipped this view to
--    security_invoker = true to silence the Supabase advisor
--    "Security Definer View" warning. Going back to invoker=false
--    re-triggers that warning. That is acceptable here because
--    the view is explicitly designed to expose redacted metadata
--    to guests — the alternative (column-level grants on lessons
--    for anon) is harder to keep correct as the schema evolves.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

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
    duration,
    duration_minutes,
    created_at
  FROM public.lessons;

COMMENT ON VIEW public.lesson_previews IS
  'Public, premium-safe view of lessons. Excludes video_url and reviewer_pdf_url.
   Readable by anon and authenticated roles so guests can browse the curriculum
   on the public course detail and lesson pages.';

GRANT SELECT ON public.lesson_previews TO anon, authenticated;
