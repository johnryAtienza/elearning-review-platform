-- ============================================================
--  MIGRATION: add_course_search_indexes
--
--  Adds full-text search support and performance indexes to the
--  courses table.  This enables server-side search via
--  Supabase's textSearch() / PostgreSQL tsvector when the
--  dataset grows too large for client-side filtering.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. Enable pg_trgm for fuzzy / trigram matching ───────────────────────────
--  Allows ILIKE and similarity() to use GIN indexes efficiently.

CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ── 2. Add optional metadata columns ─────────────────────────────────────────
--  difficulty: Beginner / Intermediate / Advanced  (NULL = unset)
--  tags:       free-form keyword array for extra search surface

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS difficulty TEXT
    CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.courses.difficulty IS 'Skill level: Beginner, Intermediate, or Advanced';
COMMENT ON COLUMN public.courses.tags       IS 'Searchable keyword tags, e.g. {react,hooks,state}';


-- ── 3. Full-text search column (tsvector) ────────────────────────────────────
--  Pre-computed weighted tsvector combining title (A) + description (B) + tags (C).
--  Kept up-to-date automatically via trigger.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate existing rows
UPDATE public.courses
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C');

-- Auto-update trigger
CREATE OR REPLACE FUNCTION public.update_course_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_search_vector_update ON public.courses;
CREATE TRIGGER courses_search_vector_update
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_course_search_vector();


-- ── 4. Indexes ────────────────────────────────────────────────────────────────

-- Full-text search (GIN on tsvector)
CREATE INDEX IF NOT EXISTS idx_courses_search_vector
  ON public.courses USING GIN (search_vector);

-- Trigram index on title for fast ILIKE / fuzzy queries
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm
  ON public.courses USING GIN (title gin_trgm_ops);

-- Trigram index on description
CREATE INDEX IF NOT EXISTS idx_courses_description_trgm
  ON public.courses USING GIN (description gin_trgm_ops);

-- GIN index on tags array for array containment queries
CREATE INDEX IF NOT EXISTS idx_courses_tags
  ON public.courses USING GIN (tags);

-- Index for sort-by-created_at (newest)
CREATE INDEX IF NOT EXISTS idx_courses_created_at
  ON public.courses (created_at DESC)
  WHERE is_published = true;

-- Index for category filter
CREATE INDEX IF NOT EXISTS idx_courses_category
  ON public.courses (category)
  WHERE is_published = true;

-- Index for difficulty filter
CREATE INDEX IF NOT EXISTS idx_courses_difficulty
  ON public.courses (difficulty)
  WHERE is_published = true;
