-- ============================================================
--  MIGRATION: rename_to_course_subject_hierarchy
--
--  Aligns the database schema with the team's intended domain
--  hierarchy:  Course → Subject → Lesson + Quiz
--
--  Before this migration:        After this migration:
--    categories  (parent)          courses    (parent)
--    courses     (child)           subjects   (child)
--    saved_courses                 saved_subjects
--    courses.category_id           subjects.course_id
--    lessons.course_id             lessons.subject_id
--    saved_courses.course_id       saved_subjects.subject_id
--
--  Scope (Phase 1 of the approved domain refactor plan):
--    - 3 table renames (courses→subjects first to vacate the slot,
--      then categories→courses, then saved_courses→saved_subjects)
--    - 3 column renames (the FK columns)
--    - 3 FK constraint renames (cosmetic; survives without)
--    - 11 index renames
--    - 3 trigger renames + 1 trigger-function rename
--    - 1 view drop+recreate (lesson_previews — replaces course_id
--      with subject_id and re-grants anon+authenticated)
--    - 3 RPC drop+recreate (return-shape changes for course/subject
--      column names and dashboard JSON key)
--    - 12 RLS policy renames (policy bodies do not reference renamed
--      table/column names by string; only the policy NAMES change)
--
--  Intentionally NOT in this migration (deferred to a follow-up):
--    - DROP COLUMN subjects.category (legacy text)
--    - DROP INDEX idx_subjects_category
--    See plan §8a for the cleanup migration.
--
--  Intentionally untouched:
--    - The `category` text column on subjects (kept for now; populated
--      by existing code paths, read by useSubjects() filter pills)
--    - URL path strings (covered in a separate, deferred sprint)
--    - The FK from saved_subjects.user_id (constraint name remains
--      saved_courses_user_id_fkey — cosmetic only; functions correctly)
--
--  Rollback strategy:
--    - Primary: Supabase snapshot restore (pre-launch, zero user data
--      risk).
--    - Secondary: a reverse migration that performs the inverse renames
--      in inverse order. Reverse script is the same length as this one
--      and is mechanically derivable.
--
--  Migration ordering note:
--    The migrations directory mixes timestamped (`20260*`) and
--    un-timestamped (`add_*`, `admin_*`, `fix_*`) files. On a fresh
--    `supabase db reset`, files run in lexicographic order — so the
--    legacy `add_*` files run AFTER this `20260606*` file. This is a
--    pre-existing inconsistency in the migration set, not introduced
--    here; production and incremental local pushes are unaffected
--    because the prior migrations have already been applied.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run,
--          or  `supabase db push`.
-- ============================================================


-- ── 1. Table renames ────────────────────────────────────────────────
--
--  Order matters: `public.courses` slot must be vacated before
--  `public.categories` can take its name.

ALTER TABLE public.courses        RENAME TO subjects;
ALTER TABLE public.categories     RENAME TO courses;
ALTER TABLE public.saved_courses  RENAME TO saved_subjects;


-- ── 2. Column renames ──────────────────────────────────────────────

ALTER TABLE public.subjects        RENAME COLUMN category_id TO course_id;
ALTER TABLE public.lessons         RENAME COLUMN course_id   TO subject_id;
ALTER TABLE public.saved_subjects  RENAME COLUMN course_id   TO subject_id;

-- (Legacy `subjects.category` text column intentionally retained;
--  cleanup deferred per plan §8a.)


-- ── 3. Foreign-key constraint renames (cosmetic, for pg_dump clarity)
--
--  Postgres auto-generated names use the original column name; the
--  underlying relationship survives the column rename automatically.
--  Renaming the constraint names keeps `\d+ subjects` etc. consistent
--  with the new vocabulary.

ALTER TABLE public.lessons
  RENAME CONSTRAINT lessons_course_id_fkey       TO lessons_subject_id_fkey;

ALTER TABLE public.saved_subjects
  RENAME CONSTRAINT saved_courses_course_id_fkey TO saved_subjects_subject_id_fkey;

ALTER TABLE public.subjects
  RENAME CONSTRAINT courses_category_id_fkey    TO subjects_course_id_fkey;


-- ── 4. Index renames ───────────────────────────────────────────────

ALTER INDEX public.idx_lessons_course_order       RENAME TO idx_lessons_subject_order;
ALTER INDEX public.idx_lessons_course_week_day    RENAME TO idx_lessons_subject_week_day;

-- Index on the legacy `category` text column. Renamed for table-name
-- consistency; the index keeps pointing at the same (kept) column.
ALTER INDEX public.idx_courses_category           RENAME TO idx_subjects_category;

ALTER INDEX public.idx_courses_category_id        RENAME TO idx_subjects_course_id;
ALTER INDEX public.idx_courses_search_vector      RENAME TO idx_subjects_search_vector;
ALTER INDEX public.idx_courses_title_trgm         RENAME TO idx_subjects_title_trgm;
ALTER INDEX public.idx_courses_description_trgm   RENAME TO idx_subjects_description_trgm;
ALTER INDEX public.idx_courses_tags               RENAME TO idx_subjects_tags;
ALTER INDEX public.idx_courses_created_at         RENAME TO idx_subjects_created_at;
ALTER INDEX public.idx_courses_difficulty         RENAME TO idx_subjects_difficulty;
ALTER INDEX public.idx_categories_slug            RENAME TO idx_courses_slug;


-- ── 5. Trigger renames ─────────────────────────────────────────────

ALTER TRIGGER categories_updated_at        ON public.courses  RENAME TO courses_updated_at;
ALTER TRIGGER trg_courses_updated_at       ON public.subjects RENAME TO trg_subjects_updated_at;
ALTER TRIGGER courses_search_vector_update ON public.subjects RENAME TO subjects_search_vector_update;


-- ── 6. Trigger-function rename ─────────────────────────────────────
--
--  Postgres triggers reference functions by OID, so the existing
--  triggers continue to fire `update_subject_search_vector()` after
--  this rename.

ALTER FUNCTION public.update_course_search_vector() RENAME TO update_subject_search_vector;


-- ── 7. Recreate lesson_previews view ───────────────────────────────
--
--  The view exposes the renamed `subject_id` column. Permissions
--  (anon + authenticated read) are re-issued because DROP VIEW
--  discards them.

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
    duration,
    duration_minutes,
    created_at
  FROM public.lessons;

COMMENT ON VIEW public.lesson_previews IS
  'Public, premium-safe view of lessons. Excludes video_url and reviewer_pdf_url.
   Readable by anon and authenticated roles so guests can browse the curriculum
   and identify free-preview lessons on public subject detail and lesson pages.';

GRANT SELECT ON public.lesson_previews TO anon, authenticated;


-- ── 8. Recreate RPCs with new return shapes ────────────────────────

-- 8a. get_saved_subjects_progress — return column course_id → subject_id

DROP FUNCTION IF EXISTS public.get_saved_courses_progress();

CREATE FUNCTION public.get_saved_subjects_progress()
RETURNS TABLE (
  subject_id      UUID,
  watched_lessons BIGINT,
  total_lessons   BIGINT,
  added_at        TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ss.subject_id,
    COALESCE((
      SELECT COUNT(*)
      FROM   lesson_progress lp
      JOIN   lessons          l  ON l.id::text = lp.lesson_id
      WHERE  lp.user_id    = auth.uid()
        AND  l.subject_id  = ss.subject_id
        AND  lp.is_watched = true
    ), 0)                                                            AS watched_lessons,
    (SELECT COUNT(*) FROM lessons WHERE subject_id = ss.subject_id)  AS total_lessons,
    ss.added_at
  FROM  saved_subjects ss
  WHERE ss.user_id = auth.uid()
  ORDER BY ss.added_at DESC;
$$;

COMMENT ON FUNCTION public.get_saved_subjects_progress IS
  'Returns saved subjects with per-subject lesson progress for the calling user.';

GRANT EXECUTE ON FUNCTION public.get_saved_subjects_progress() TO authenticated;


-- 8b. get_dashboard_stats — JSON key courses_saved → subjects_saved

DROP FUNCTION IF EXISTS public.get_dashboard_stats();

CREATE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'subjects_saved',    (SELECT COUNT(*) FROM saved_subjects  WHERE user_id = auth.uid()),
    'lessons_completed', (SELECT COUNT(*) FROM lesson_progress WHERE user_id = auth.uid() AND is_watched = true),
    'quizzes_taken',     (SELECT COUNT(*) FROM quiz_results    WHERE user_id = auth.uid())
  );
$$;

COMMENT ON FUNCTION public.get_dashboard_stats IS
  'Returns aggregated dashboard metrics (subjects saved, lessons completed, quizzes taken) for the calling user.';

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;


-- 8c. get_quiz_history — return columns course_id/course_title → subject_id/subject_title

DROP FUNCTION IF EXISTS public.get_quiz_history(int);

CREATE FUNCTION public.get_quiz_history(p_limit int DEFAULT 50)
RETURNS TABLE (
  id            uuid,
  lesson_id     uuid,
  lesson_title  text,
  subject_id    uuid,
  subject_title text,
  score         int,
  total         int,
  submitted_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qr.id,
    qr.lesson_id,
    l.title       AS lesson_title,
    l.subject_id,
    s.title       AS subject_title,
    qr.score,
    qr.total,
    qr.submitted_at
  FROM public.quiz_results qr
  JOIN public.lessons  l ON l.id = qr.lesson_id
  JOIN public.subjects s ON s.id = l.subject_id
  WHERE qr.user_id = auth.uid()
  ORDER BY qr.submitted_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_quiz_history(int) IS
  'Returns the calling user''s quiz attempts (newest first) joined with lesson and subject titles.';

GRANT EXECUTE ON FUNCTION public.get_quiz_history(int) TO authenticated;


-- ── 9. RLS policy renames ──────────────────────────────────────────
--
--  Policies survive `ALTER TABLE … RENAME TO` automatically — the
--  same pg_policy rows are now attached to the renamed relations.
--  Only the policy NAMES are stale; bodies do not reference the
--  renamed tables/columns by string.

-- 9a. On public.courses (was public.categories)
ALTER POLICY "categories: public read"  ON public.courses RENAME TO "courses: public read";
ALTER POLICY "categories: admin insert" ON public.courses RENAME TO "courses: admin insert";
ALTER POLICY "categories: admin update" ON public.courses RENAME TO "courses: admin update";
ALTER POLICY "categories: admin delete" ON public.courses RENAME TO "courses: admin delete";

-- 9b. On public.subjects (was public.courses)
ALTER POLICY "courses: anyone reads published" ON public.subjects RENAME TO "subjects: anyone reads published";
ALTER POLICY "courses: admin reads all"        ON public.subjects RENAME TO "subjects: admin reads all";
ALTER POLICY "courses: admin insert"           ON public.subjects RENAME TO "subjects: admin insert";
ALTER POLICY "courses: admin update"           ON public.subjects RENAME TO "subjects: admin update";
ALTER POLICY "courses: admin delete"           ON public.subjects RENAME TO "subjects: admin delete";

-- 9c. On public.saved_subjects (was public.saved_courses)
ALTER POLICY "saved_courses: read own"   ON public.saved_subjects RENAME TO "saved_subjects: read own";
ALTER POLICY "saved_courses: insert own" ON public.saved_subjects RENAME TO "saved_subjects: insert own";
ALTER POLICY "saved_courses: delete own" ON public.saved_subjects RENAME TO "saved_subjects: delete own";


-- ============================================================
-- DONE
-- ============================================================
-- Renamed:    3 tables, 3 columns, 3 FK constraints, 11 indexes,
--             3 triggers, 1 function, 12 RLS policies
-- Recreated:  1 view (lesson_previews), 3 RPCs
-- Kept:       subjects.category text column (legacy; see plan §8a)
-- ============================================================
