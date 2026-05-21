-- ============================================================
--  MIGRATION: book_status_enum
--
--  Replaces books.is_published (boolean) with a three-state
--  status column: draft | published | archived.
--
--  - draft     → hidden from public catalog (default for new rows)
--  - published → visible to customers
--  - archived  → hidden from public catalog, retained so that
--                historical book_orders.book_id joins still resolve
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. Add the new column with a CHECK constraint and a safe default.
ALTER TABLE public.books
  ADD COLUMN status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived'));

-- 2. Backfill from the existing boolean.
UPDATE public.books
SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;

-- 3. Drop the old index that referenced is_published.
DROP INDEX IF EXISTS public.books_published_idx;

-- 4. Drop and recreate the public-read RLS policy against the new column.
DROP POLICY IF EXISTS "books: anyone reads published" ON public.books;
CREATE POLICY "books: anyone reads published"
  ON public.books
  FOR SELECT
  USING (status = 'published');

-- 5. Drop the old boolean column.
ALTER TABLE public.books DROP COLUMN is_published;

-- 6. New index for the public catalog query (status + recency).
CREATE INDEX IF NOT EXISTS books_status_created_idx
  ON public.books (status, created_at DESC);

COMMENT ON COLUMN public.books.status IS
  'Lifecycle: draft (hidden, default), published (visible to customers), archived (hidden, retained for historical orders).';
