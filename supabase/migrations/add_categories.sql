-- ──────────────────────────────────────────────────────────────────────────────
-- add_categories.sql
--
-- Creates the categories lookup table, links it to courses via category_id FK,
-- migrates existing category text values, and sets up RLS.
--
-- Run in Supabase Dashboard → SQL Editor → New Query → Run
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Categories table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_unique UNIQUE (name),
  CONSTRAINT categories_slug_unique UNIQUE (slug)
);

-- ── 2. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can read categories for the filter UI
CREATE POLICY "categories: public read"
  ON public.categories FOR SELECT USING (true);

-- Only admins can create / update / delete
CREATE POLICY "categories: admin insert"
  ON public.categories FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "categories: admin update"
  ON public.categories FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "categories: admin delete"
  ON public.categories FOR DELETE USING (public.is_admin());

-- ── 3. Add category_id FK to courses ─────────────────────────────────────────

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category_id UUID
    REFERENCES public.categories(id)
    ON DELETE SET NULL;   -- deleting a category → courses.category_id becomes NULL

-- ── 4. Migrate existing category text → categories table ─────────────────────

-- Insert distinct non-empty category names that aren't already in the table
INSERT INTO public.categories (name, slug)
SELECT
  DISTINCT category,
  lower(regexp_replace(trim(category), '[^a-zA-Z0-9]+', '-', 'g'))
FROM public.courses
WHERE category IS NOT NULL
  AND trim(category) <> ''
ON CONFLICT (name) DO NOTHING;

-- Back-fill category_id on existing courses by matching name
UPDATE public.courses c
SET category_id = cat.id
FROM public.categories cat
WHERE c.category = cat.name
  AND c.category_id IS NULL;

-- ── 5. Index for fast lookups ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_courses_category_id
  ON public.courses (category_id);

CREATE INDEX IF NOT EXISTS idx_categories_slug
  ON public.categories (slug);

-- ── 6. updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_updated_at ON public.categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
