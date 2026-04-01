-- ============================================================
--  SEED: create_admin
--
--  Creates the admin user and grants the admin role.
--
--  Prerequisites:
--    Run supabase/migrations/add_admin_role.sql first.
--
--  Instructions:
--  1. Go to Supabase Dashboard → Authentication → Users
--  2. Click "Add user" → "Create new user"
--     Email:    elearning_admin@yopmail.com
--     Password: Admin123!!
--     ☑ Auto Confirm User  ← tick this so no email needed
--  3. Then paste and run THIS script in:
--     Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- Step 1 — Grant admin role in app_metadata
-- (app_metadata can only be written server-side — users cannot modify it)
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'elearning_admin@yopmail.com';

-- Verify Step 1
SELECT id, email, raw_app_meta_data->>'role' AS role
FROM auth.users
WHERE email = 'elearning_admin@yopmail.com';


-- Step 2 — Sync role to the profiles table
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'elearning_admin@yopmail.com'
);

-- Verify Step 2
SELECT p.id, p.name, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'elearning_admin@yopmail.com';


-- ── Expected output ───────────────────────────────────────────
-- Both queries should return one row with role = 'admin'.
-- If profiles row is missing, the handle_new_user trigger may not
-- have fired — run this to create it manually:
--
-- INSERT INTO public.profiles (id, name, role)
-- SELECT id, split_part(email, '@', 1), 'admin'
-- FROM auth.users
-- WHERE email = 'elearning_admin@yopmail.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
