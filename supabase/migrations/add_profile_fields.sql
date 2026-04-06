-- ============================================================
--  MIGRATION: add_profile_fields
--
--  Adds first_name, last_name, mobile_number, and email to
--  the profiles table (skips each if already existing).
--  Updates handle_new_user trigger and admin_user_list view.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. Add new columns to profiles (safe — skips if existing) ────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email        TEXT,
  ADD COLUMN IF NOT EXISTS first_name   TEXT,
  ADD COLUMN IF NOT EXISTS last_name    TEXT,
  ADD COLUMN IF NOT EXISTS mobile_number TEXT;


-- ── 2. Update handle_new_user trigger to populate new fields ─────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, first_name, last_name, mobile_number, role)
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
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'mobile_number', ''),
    COALESCE(new.raw_app_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email         = EXCLUDED.email,
    first_name    = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name     = COALESCE(EXCLUDED.last_name, profiles.last_name),
    mobile_number = COALESCE(EXCLUDED.mobile_number, profiles.mobile_number);
  RETURN new;
END;
$$;


-- ── 3. Recreate admin_user_list view to include new fields ───────────────────

CREATE OR REPLACE VIEW public.admin_user_list
WITH (security_invoker = true)
AS
  SELECT
    p.id,
    p.name,
    p.email,
    p.first_name,
    p.last_name,
    p.mobile_number,
    p.role,
    p.created_at,
    COALESCE(s.is_active, false)   AS is_subscribed,
    s.expires_at                   AS subscription_expires_at
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  WHERE public.is_admin()
  ORDER BY p.created_at DESC;
