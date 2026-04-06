-- ============================================================
--  MIGRATION: add_subscription_tiers
--
--  Adds a `tier` column to the subscriptions table to support
--  multiple subscription plans (free / standard).
--
--  Safe to run multiple times — uses IF NOT EXISTS guards.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. Add tier column to subscriptions ─────────────────────────────────────

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'standard'
  CHECK (tier IN ('free', 'standard'));

COMMENT ON COLUMN public.subscriptions.tier IS
  'Subscription tier: free (preview access) or standard (full access)';


-- ── 2. Backfill existing rows ────────────────────────────────────────────────
-- All existing subscriptions were created before tiers existed; treat as standard.

UPDATE public.subscriptions
  SET tier = 'standard'
  WHERE tier IS NULL OR tier = '';


-- ── 3. Create helper function: get_user_tier() ───────────────────────────────
-- Returns the effective tier for the given user:
--   • 'standard' if there is an active subscription
--   • 'free'     otherwise

CREATE OR REPLACE FUNCTION public.get_user_tier(uid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT tier
      FROM public.subscriptions
      WHERE user_id = uid
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    ),
    'free'
  );
$$;


-- ── 4. Recreate admin_user_list view to expose tier ──────────────────────────

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
    p.role,
    p.created_at,
    COALESCE(s.is_active, false)  AS is_subscribed,
    COALESCE(s.tier, 'free')      AS subscription_tier,
    s.expires_at                  AS subscription_expires_at
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  WHERE public.is_admin()
  ORDER BY p.created_at DESC;
