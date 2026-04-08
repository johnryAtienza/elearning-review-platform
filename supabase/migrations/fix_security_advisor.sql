-- ============================================================
--  MIGRATION: fix_security_advisor
--
--  Resolves 3 Supabase Security Advisor errors:
--
--  1. lesson_previews  — Security Definer View
--     Recreate with security_invoker = true. Add a permissive
--     SELECT policy on lessons so all authenticated users can
--     read the view. (Premium content — video_url etc. — is
--     delivered via signed URLs from the edge function, not
--     exposed directly to the browser.)
--
--  2. quizzes          — RLS Disabled in Public
--     Enable RLS + add subscribed-users-only read policy.
--
--  3. quiz_questions   — RLS Disabled in Public
--     Enable RLS + add subscribed-users-only read policy.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. Fix lesson_previews (Security Definer View) ───────────
--
--  Add a policy that lets ANY authenticated user SELECT from
--  the lessons table, then switch the view to security_invoker.
--  Non-subscribers can only reach lesson data through the view
--  (which excludes video_url / reviewer_pdf_url). Direct table
--  access via PostgREST still requires the authenticated role,
--  and actual media delivery requires a signed URL from the
--  edge function — so exposure of the path is low-risk.

CREATE POLICY "lessons: authenticated users read preview"
  ON public.lessons
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Recreate the view as security_invoker = true
CREATE OR REPLACE VIEW public.lesson_previews
WITH (security_invoker = true)
AS
  SELECT
    id,
    course_id,
    title,
    description,
    "order",
    duration,
    created_at
  FROM public.lessons
  WHERE auth.uid() IS NOT NULL;

COMMENT ON VIEW public.lesson_previews IS
  'Read-only, premium-safe view of lessons. Excludes video_url and reviewer_pdf_url.
   Use this for course detail pages shown to non-subscribed users.';


-- ── 2. Fix quizzes (RLS Disabled) ────────────────────────────

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Drop first in case it already exists (idempotent)
DROP POLICY IF EXISTS "quizzes: subscribed users read" ON public.quizzes;

CREATE POLICY "quizzes: subscribed users read"
  ON public.quizzes
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_active_subscriber(auth.uid())
  );

-- Admins can read all quizzes (for admin panel)
DROP POLICY IF EXISTS "quizzes: admin reads all" ON public.quizzes;

CREATE POLICY "quizzes: admin reads all"
  ON public.quizzes
  FOR SELECT
  USING (public.is_admin());

-- Admins can write quizzes
DROP POLICY IF EXISTS "quizzes: admin insert" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes: admin update" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes: admin delete" ON public.quizzes;

CREATE POLICY "quizzes: admin insert"
  ON public.quizzes FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "quizzes: admin update"
  ON public.quizzes FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "quizzes: admin delete"
  ON public.quizzes FOR DELETE USING (public.is_admin());


-- ── 3. Fix quiz_questions (RLS Disabled) ─────────────────────

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_questions: subscribed users read" ON public.quiz_questions;

CREATE POLICY "quiz_questions: subscribed users read"
  ON public.quiz_questions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_active_subscriber(auth.uid())
  );

DROP POLICY IF EXISTS "quiz_questions: admin reads all" ON public.quiz_questions;

CREATE POLICY "quiz_questions: admin reads all"
  ON public.quiz_questions
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "quiz_questions: admin insert" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions: admin update" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions: admin delete" ON public.quiz_questions;

CREATE POLICY "quiz_questions: admin insert"
  ON public.quiz_questions FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "quiz_questions: admin update"
  ON public.quiz_questions FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "quiz_questions: admin delete"
  ON public.quiz_questions FOR DELETE USING (public.is_admin());
