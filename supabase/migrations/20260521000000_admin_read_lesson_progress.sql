-- ============================================================
--  MIGRATION: admin_read_lesson_progress
--
--  Grants admins SELECT access to all lesson_progress rows so
--  the admin dashboard can compute completion stats (number of
--  students who finished a lesson, total lesson completions).
--
--  Prerequisites:
--    - add_admin_role.sql (defines is_admin())
--    - add_lesson_progress.sql (defines the table + base policies)
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

CREATE POLICY "lesson_progress: admin reads all"
  ON public.lesson_progress
  FOR SELECT
  USING (public.is_admin());
