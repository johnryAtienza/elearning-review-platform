-- ============================================================
--  MIGRATION: admin_read_policies
--
--  Grants admins SELECT access to all profiles and subscriptions
--  so the admin panel can list users and subscription statuses.
--
--  Prerequisites: run add_admin_role.sql first (defines is_admin()).
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── profiles: admin can read all rows ────────────────────────
CREATE POLICY "profiles: admin reads all"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());


-- ── subscriptions: admin can read all rows ───────────────────
CREATE POLICY "subscriptions: admin reads all"
  ON public.subscriptions
  FOR SELECT
  USING (public.is_admin());


-- ── Admin users view ─────────────────────────────────────────
-- Joins profiles with subscription status for the admin panel.
-- security_invoker = true → runs with the caller's JWT.
-- The is_admin() call in the WHERE clause ensures only admins
-- can retrieve rows — non-admins get an empty result set.

CREATE OR REPLACE VIEW public.admin_user_list
WITH (security_invoker = true)
AS
  SELECT
    p.id,
    p.name,
    p.role,
    p.created_at,
    COALESCE(s.is_active, false)                    AS is_subscribed,
    s.expires_at                                     AS subscription_expires_at
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  WHERE public.is_admin()
  ORDER BY p.created_at DESC;

COMMENT ON VIEW public.admin_user_list IS
  'Admin-only view: profiles joined with subscription status.
   Returns rows only when is_admin() = true for the calling user.';
