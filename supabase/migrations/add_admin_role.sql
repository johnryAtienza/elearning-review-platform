-- ============================================================
--  MIGRATION: add_admin_role
--
--  Run this in:
--  Supabase Dashboard → SQL Editor → New Query → Run
--
--  What this does:
--  1. Adds a `role` column to profiles ('user' | 'admin')
--  2. Adds is_admin() helper for RLS policies
--  3. Updates handle_new_user trigger to carry role from app_metadata
--  4. Adds admin RLS policies to courses and lessons
-- ============================================================


-- ── 1. Add role column to profiles ───────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

COMMENT ON COLUMN public.profiles.role IS
  'User role. ''admin'' grants full CRUD on courses and lessons.
   Only set via server-side SQL or the Supabase admin API — never via client.';


-- ── 2. is_admin() helper ──────────────────────────────────────
-- Reads from auth.users.raw_app_meta_data (server-side only field).
-- app_metadata cannot be modified by the user via the client SDK,
-- making it the secure source-of-truth for roles.

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT raw_app_meta_data->>'role' = 'admin'
       FROM auth.users
      WHERE id = uid),
    false
  );
$$;

COMMENT ON FUNCTION public.is_admin IS
  'Returns true when the given user (default: current user) has role=admin in app_metadata.';


-- ── 3. Update handle_new_user to sync role from app_metadata ─
-- When an admin is created via the admin API/SQL with app_metadata.role='admin',
-- the profile row is auto-created with the correct role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_app_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;


-- ── 4. Admin RLS policies ─────────────────────────────────────
-- Admins get full INSERT / UPDATE / DELETE on courses and lessons.
-- The existing SELECT policies (published courses visible to all, etc.)
-- already apply; these policies add write access for admins.

-- courses: admin write
CREATE POLICY "courses: admin insert"
  ON public.courses
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "courses: admin update"
  ON public.courses
  FOR UPDATE
  USING     (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "courses: admin delete"
  ON public.courses
  FOR DELETE
  USING (public.is_admin());

-- courses: admins can also read unpublished drafts
CREATE POLICY "courses: admin reads all"
  ON public.courses
  FOR SELECT
  USING (public.is_admin());

-- lessons: admin write
CREATE POLICY "lessons: admin insert"
  ON public.lessons
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "lessons: admin update"
  ON public.lessons
  FOR UPDATE
  USING     (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "lessons: admin delete"
  ON public.lessons
  FOR DELETE
  USING (public.is_admin());

-- lessons: admins can read all lessons (including unpublished / premium)
CREATE POLICY "lessons: admin reads all"
  ON public.lessons
  FOR SELECT
  USING (public.is_admin());
