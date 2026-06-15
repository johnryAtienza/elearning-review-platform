-- ============================================================
--  MIGRATION: add_problem_set_categories
--
--  Split problem-set title from the lesson tab grouping label.
--  Existing problem sets are assigned to the default "Elements"
--  category while preserving quizzes.title as the set title.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.problem_set_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 40,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS problem_set_categories_name_key
  ON public.problem_set_categories (lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_problem_set_categories_sort
  ON public.problem_set_categories (sort_order, name);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'problem_set_categories_name_not_blank'
      AND conrelid = 'public.problem_set_categories'::regclass
  ) THEN
    ALTER TABLE public.problem_set_categories
      ADD CONSTRAINT problem_set_categories_name_not_blank
      CHECK (btrim(name) <> '');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_problem_set_categories_updated_at ON public.problem_set_categories;
    CREATE TRIGGER trg_problem_set_categories_updated_at
      BEFORE UPDATE ON public.problem_set_categories
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END $$;

INSERT INTO public.problem_set_categories (name, sort_order)
SELECT 'Elements', 40
WHERE NOT EXISTS (
  SELECT 1
  FROM public.problem_set_categories
  WHERE lower(btrim(name)) = 'elements'
);

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.problem_set_categories(id) ON DELETE RESTRICT;

UPDATE public.quizzes
SET category_id = (
  SELECT id
  FROM public.problem_set_categories
  WHERE lower(btrim(name)) = 'elements'
  ORDER BY sort_order, name
  LIMIT 1
)
WHERE category_id IS NULL;

ALTER TABLE public.quizzes
  ALTER COLUMN category_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_category_sort
  ON public.quizzes (lesson_id, category_id, sort_order, created_at);

ALTER TABLE public.problem_set_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "problem_set_categories: public read" ON public.problem_set_categories;
CREATE POLICY "problem_set_categories: public read"
  ON public.problem_set_categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "problem_set_categories: admin insert" ON public.problem_set_categories;
CREATE POLICY "problem_set_categories: admin insert"
  ON public.problem_set_categories FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "problem_set_categories: admin update" ON public.problem_set_categories;
CREATE POLICY "problem_set_categories: admin update"
  ON public.problem_set_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "problem_set_categories: admin delete" ON public.problem_set_categories;
CREATE POLICY "problem_set_categories: admin delete"
  ON public.problem_set_categories FOR DELETE
  USING (public.is_admin());

COMMENT ON TABLE public.problem_set_categories IS
  'Reusable admin-managed labels for grouping lesson problem sets into tabs.';

COMMENT ON COLUMN public.quizzes.title IS
  'Specific problem set title, e.g. Algebra Basics Set 1.';

COMMENT ON COLUMN public.quizzes.category_id IS
  'Managed problem set category used as the lesson-page tab label.';

COMMENT ON COLUMN public.quizzes.sort_order IS
  'Display order for problem sets within their lesson/category.';

NOTIFY pgrst, 'reload schema';
