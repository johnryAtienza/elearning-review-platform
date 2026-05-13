-- ============================================================
--  MIGRATION: add_profile_school
--
--  Adds school + school_id to profiles for Phase F. Updates the
--  handle_new_user trigger to populate them from registration
--  metadata, and extends admin_user_list to surface them.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
--           (or `supabase db push` if all migrations have timestamp prefixes)
-- ============================================================


-- ── 1. Add new columns (safe — skips if existing) ──────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school    TEXT,
  ADD COLUMN IF NOT EXISTS school_id TEXT;

COMMENT ON COLUMN public.profiles.school IS
  'Free-text school / university name. Captured at registration; editable from /profile.';
COMMENT ON COLUMN public.profiles.school_id IS
  'Student ID number from the user''s school. Free-text — formats vary by institution.';


-- ── 2. Update handle_new_user trigger to read school metadata ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, email, first_name, last_name, mobile_number, school, school_id, role
  )
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'name',
      CONCAT(
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(new.raw_user_meta_data->>'last_name', '')
      ),
      split_part(new.email, '@', 1)
    ),
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name',    ''),
    COALESCE(new.raw_user_meta_data->>'last_name',     ''),
    COALESCE(new.raw_user_meta_data->>'mobile_number', ''),
    COALESCE(new.raw_user_meta_data->>'school',        ''),
    COALESCE(new.raw_user_meta_data->>'school_id',     ''),
    COALESCE(new.raw_app_meta_data->>'role',           'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email         = EXCLUDED.email,
    first_name    = COALESCE(EXCLUDED.first_name,    profiles.first_name),
    last_name     = COALESCE(EXCLUDED.last_name,     profiles.last_name),
    mobile_number = COALESCE(EXCLUDED.mobile_number, profiles.mobile_number),
    school        = COALESCE(EXCLUDED.school,        profiles.school),
    school_id     = COALESCE(EXCLUDED.school_id,     profiles.school_id);
  RETURN new;
END;
$$;


-- ── 3. Recreate admin_user_list view to include school + school_id ─
DROP VIEW IF EXISTS public.admin_user_list;

CREATE VIEW public.admin_user_list
WITH (security_invoker = true)
AS
  SELECT
    p.id,
    p.name,
    p.email,
    p.first_name,
    p.last_name,
    p.mobile_number,
    p.school,
    p.school_id,
    p.role,
    p.created_at,
    COALESCE(s.is_active, false)   AS is_subscribed,
    s.expires_at                   AS subscription_expires_at
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  WHERE public.is_admin()
  ORDER BY p.created_at DESC;

COMMENT ON VIEW public.admin_user_list IS
  'Admin user list. Includes school + school_id (Phase F). Visible only to admins.';
