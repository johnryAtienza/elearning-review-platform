-- ============================================================
--  MIGRATION: add_faq_categories
--
--  Normalizes FAQ categories:
--    - category rows live in faq_categories
--    - faqs.category_id points to the managed category
--    - faqs.category remains as migration fallback copy
-- ============================================================

CREATE TABLE IF NOT EXISTS public.faq_categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  sort_order int         NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.faq_categories IS
  'Managed public FAQ page category headings. Admin-managed; public reads active rows only.';

CREATE UNIQUE INDEX IF NOT EXISTS faq_categories_name_unique_idx
  ON public.faq_categories (lower(btrim(name)));

CREATE INDEX IF NOT EXISTS faq_categories_public_idx
  ON public.faq_categories (sort_order ASC, created_at ASC)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_faq_categories_updated_at ON public.faq_categories;
CREATE TRIGGER trg_faq_categories_updated_at
  BEFORE UPDATE ON public.faq_categories
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.faq_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS faqs_category_idx
  ON public.faqs (category_id, sort_order ASC);

WITH default_categories(id, name, sort_order) AS (
  VALUES
    ('77777777-7777-4777-8777-777777777751'::uuid, 'Enrollment', 0),
    ('77777777-7777-4777-8777-777777777752'::uuid, 'Access & content', 1),
    ('77777777-7777-4777-8777-777777777753'::uuid, 'Books & shipping', 2),
    ('77777777-7777-4777-8777-777777777754'::uuid, 'Payments', 3),
    ('77777777-7777-4777-8777-777777777755'::uuid, 'Account & devices', 4)
)
INSERT INTO public.faq_categories (id, name, sort_order, is_active)
SELECT d.id, d.name, d.sort_order, true
FROM default_categories d
WHERE EXISTS (
  SELECT 1
  FROM public.faqs f
  WHERE f.category IS NOT NULL
    AND lower(btrim(f.category)) = lower(btrim(d.name))
)
AND NOT EXISTS (
  SELECT 1
  FROM public.faq_categories c
  WHERE lower(btrim(c.name)) = lower(btrim(d.name))
);

WITH faq_category_names AS (
  SELECT
    btrim(category) AS name,
    MIN(sort_order) AS first_sort_order
  FROM public.faqs
  WHERE category IS NOT NULL
    AND btrim(category) <> ''
  GROUP BY btrim(category)
),
custom_categories AS (
  SELECT
    name,
    first_sort_order,
    ROW_NUMBER() OVER (ORDER BY first_sort_order ASC, name ASC) AS position_index
  FROM faq_category_names f
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.faq_categories c
    WHERE lower(btrim(c.name)) = lower(btrim(f.name))
  )
),
category_offset AS (
  SELECT COALESCE(MAX(sort_order), -1) AS max_sort_order
  FROM public.faq_categories
)
INSERT INTO public.faq_categories (name, sort_order, is_active)
SELECT
  c.name,
  o.max_sort_order + c.position_index,
  true
FROM custom_categories c
CROSS JOIN category_offset o;

UPDATE public.faqs f
SET category_id = c.id
FROM public.faq_categories c
WHERE f.category_id IS NULL
  AND f.category IS NOT NULL
  AND lower(btrim(f.category)) = lower(btrim(c.name));

ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_categories: public read active"
  ON public.faq_categories;
CREATE POLICY "faq_categories: public read active"
  ON public.faq_categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "faq_categories: admin all"
  ON public.faq_categories;
CREATE POLICY "faq_categories: admin all"
  ON public.faq_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "faqs: public read active"
  ON public.faqs;
CREATE POLICY "faqs: public read active"
  ON public.faqs
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (
      category_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.faq_categories c
        WHERE c.id = faqs.category_id
          AND c.is_active = true
      )
    )
  );

GRANT SELECT ON public.faq_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faq_categories TO authenticated;
