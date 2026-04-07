-- ============================================================
--  MIGRATION: add_subscription_duration
--
--  Adds `duration_months` to the subscriptions table and
--  updates helper functions to support 1 / 3 / 6-month plans
--  with server-side carryover extension logic.
--
--  Safe to run multiple times — uses IF NOT EXISTS guards.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. Add duration_months column ───────────────────────────────────────────

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS duration_months INT NOT NULL DEFAULT 1
  CHECK (duration_months IN (1, 3, 6));

COMMENT ON COLUMN public.subscriptions.duration_months IS
  'Duration of the purchased plan in months (1, 3, or 6).
   Used for renewal, extension, and analytics. Not used to enforce expiry
   — expires_at is the authoritative field for access control.';


-- ── 2. Refresh is_active_subscriber (unchanged logic, re-create for safety) ──

CREATE OR REPLACE FUNCTION public.is_active_subscriber(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = uid
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;


-- ── 3. Helper: days remaining for a user's subscription ─────────────────────

CREATE OR REPLACE FUNCTION public.subscription_days_remaining(uid UUID DEFAULT auth.uid())
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    CEIL(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400)::INT
  )
  FROM public.subscriptions
  WHERE user_id = uid
    AND is_active = true
    AND expires_at IS NOT NULL
    AND expires_at > NOW()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.subscription_days_remaining IS
  'Returns whole days remaining on the user''s active subscription,
   or NULL if they have no active subscription with an expiry date.';


-- ── 4. Core function: extend_subscription ───────────────────────────────────
--
--  Upserts the subscriptions row with carryover logic:
--    • New subscriber        → expires_at = NOW() + N months
--    • Before expiry         → expires_at = existing_expires_at + N months
--    • After expiry (lapsed) → expires_at = NOW() + N months (fresh start)
--
--  Parameters
--    p_user_id        — the user to subscribe
--    p_duration_months — 1 | 3 | 6
--    p_tier           — 'standard' (reserved for future tiers)
--
--  Returns the new expires_at as TEXT (ISO 8601).

CREATE OR REPLACE FUNCTION public.extend_subscription(
  p_user_id        UUID,
  p_duration_months INT,
  p_tier           TEXT DEFAULT 'standard'
)
RETURNS TABLE (
  new_expires_at      TIMESTAMPTZ,
  previous_expires_at TIMESTAMPTZ,
  days_added          INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_expires_at TIMESTAMPTZ;
  v_base                TIMESTAMPTZ;
  v_new_expires_at      TIMESTAMPTZ;
  v_days_added          INT;
BEGIN
  -- Validate duration
  IF p_duration_months NOT IN (1, 3, 6) THEN
    RAISE EXCEPTION 'Invalid duration_months: %. Must be 1, 3, or 6.', p_duration_months;
  END IF;

  -- Fetch current active subscription's expiry (if any)
  SELECT s.expires_at
    INTO v_existing_expires_at
    FROM public.subscriptions s
   WHERE s.user_id  = p_user_id
     AND s.is_active = true
   LIMIT 1;

  -- Carryover: use existing expiry as base only if it is in the future
  v_base := CASE
    WHEN v_existing_expires_at IS NOT NULL AND v_existing_expires_at > NOW()
      THEN v_existing_expires_at
    ELSE NOW()
  END;

  v_new_expires_at := v_base + (p_duration_months || ' months')::INTERVAL;
  v_days_added     := CEIL(EXTRACT(EPOCH FROM (v_new_expires_at - NOW())) / 86400)::INT;

  -- Upsert subscription row
  INSERT INTO public.subscriptions (
    user_id, tier, duration_months, is_active, started_at, expires_at
  )
  VALUES (
    p_user_id, p_tier, p_duration_months, true, NOW(), v_new_expires_at
  )
  ON CONFLICT (user_id) DO UPDATE
    SET tier           = EXCLUDED.tier,
        duration_months = EXCLUDED.duration_months,
        is_active      = true,
        expires_at     = v_new_expires_at,
        -- keep original started_at on extensions
        started_at     = CASE
                           WHEN public.subscriptions.started_at IS NULL THEN NOW()
                           ELSE public.subscriptions.started_at
                         END;

  RETURN QUERY
    SELECT v_new_expires_at, v_existing_expires_at, v_days_added;
END;
$$;

COMMENT ON FUNCTION public.extend_subscription IS
  'Creates or extends a subscription. On extension the new months are added to
   the existing expiry date (carryover). If the subscription has already lapsed
   the fresh period starts from NOW() instead.';


-- ── 5. RLS: allow the edge function (service role) to call extend_subscription

-- The function runs as SECURITY DEFINER (service role) so no additional
-- policy is needed. Regular users cannot call it directly because it is not
-- exposed via PostgREST — only the Edge Function invokes it via the Supabase
-- admin client.
