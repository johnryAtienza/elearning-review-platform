-- ============================================================
--  MIGRATION: add_problem_set_fields_to_quizzes
--
--  Treat each quizzes row as a configurable lesson problem set.
--  Existing quizzes are preserved and surfaced as the default
--  "Elements" problem set.
-- ============================================================

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS title text;

UPDATE public.quizzes
SET title = 'Elements'
WHERE title IS NULL OR btrim(title) = '';

ALTER TABLE public.quizzes
  ALTER COLUMN title SET DEFAULT 'Elements',
  ALTER COLUMN title SET NOT NULL;

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS sort_order integer;

UPDATE public.quizzes
SET sort_order = 40
WHERE sort_order IS NULL;

ALTER TABLE public.quizzes
  ALTER COLUMN sort_order SET DEFAULT 40,
  ALTER COLUMN sort_order SET NOT NULL;

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS status text;

UPDATE public.quizzes
SET status = 'published'
WHERE status IS NULL OR status NOT IN ('draft', 'published');

ALTER TABLE public.quizzes
  ALTER COLUMN status SET DEFAULT 'published',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'quizzes_status_check'
      AND conrelid = 'public.quizzes'::regclass
  ) THEN
    ALTER TABLE public.quizzes
      ADD CONSTRAINT quizzes_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_sort
  ON public.quizzes (lesson_id, sort_order, created_at);

COMMENT ON COLUMN public.quizzes.title IS
  'Problem set title shown as a lesson action tab, e.g. Elements or Core Problems.';

COMMENT ON COLUMN public.quizzes.sort_order IS
  'Display order for problem-set tabs within a lesson.';

COMMENT ON COLUMN public.quizzes.status IS
  'draft problem sets are hidden from students; published sets render as lesson tabs.';
