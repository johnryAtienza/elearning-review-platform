-- ============================================================
--  MIGRATION: harden_subscription_permissions
--
--  Security goal:
--    * Users may read their own subscription state.
--    * Admins may read all subscription rows.
--    * No browser/client role may insert, update, delete, or directly extend
--      subscriptions.
--    * Subscription mutation happens only through trusted service-role paths
--      such as payment verification, webhooks, and future admin edge functions.
--
--  Filename intentionally starts with "zz_" because this repository currently
--  contains legacy untimestamped migrations. This hardening must run after
--  add_subscription_duration.sql creates public.extend_subscription.
-- ============================================================

BEGIN;

-- Subscriptions are read-only to client roles. All writes must happen through
-- service-role Edge Functions after payment/admin validation.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions: insert own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: update own" ON public.subscriptions;

-- Drop any out-of-band direct admin write policies if they were created in a
-- dashboard or earlier manual SQL. Admin writes should also go through an
-- audited service-role path.
DROP POLICY IF EXISTS "subscriptions: admin inserts" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: admin insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: admin updates all" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: admin update" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: admin deletes all" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: admin delete" ON public.subscriptions;

DROP POLICY IF EXISTS "subscriptions: read own" ON public.subscriptions;
CREATE POLICY "subscriptions: read own"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions: admin reads all" ON public.subscriptions;
CREATE POLICY "subscriptions: admin reads all"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscriptions FROM anon, authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

-- Lock down the privileged renewal/extension RPC. SECURITY DEFINER controls
-- table access inside the function, but EXECUTE must still be limited so users
-- cannot call it directly through PostgREST.
REVOKE ALL ON FUNCTION public.extend_subscription(uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.extend_subscription(uuid, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.extend_subscription(uuid, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.extend_subscription(uuid, integer, text) TO service_role;

-- Audit log for future manual admin subscription actions. The admin UI will read
-- this table, but only service-role code may insert events.
CREATE TABLE IF NOT EXISTS public.subscription_admin_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     UUID        REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  user_id             UUID        NOT NULL,
  admin_user_id       UUID        NOT NULL,
  action              TEXT        NOT NULL CHECK (
    action IN (
      'renew',
      'extend',
      'set_custom_expiry',
      'disable_access',
      'restore_access'
    )
  ),
  previous_is_active  BOOLEAN,
  previous_expires_at TIMESTAMPTZ,
  previous_tier       TEXT,
  new_is_active       BOOLEAN,
  new_expires_at      TIMESTAMPTZ,
  new_tier            TEXT,
  reason              TEXT,
  metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_admin_events IS
  'Audit log for manual admin subscription changes. Inserted only by service-role Edge Functions.';
COMMENT ON COLUMN public.subscription_admin_events.user_id IS
  'Target user whose subscription was changed.';
COMMENT ON COLUMN public.subscription_admin_events.admin_user_id IS
  'Admin user who performed the manual subscription action.';

CREATE INDEX IF NOT EXISTS subscription_admin_events_user_idx
  ON public.subscription_admin_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscription_admin_events_admin_user_idx
  ON public.subscription_admin_events (admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscription_admin_events_action_idx
  ON public.subscription_admin_events (action, created_at DESC);

ALTER TABLE public.subscription_admin_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_admin_events: admin reads all"
  ON public.subscription_admin_events;
CREATE POLICY "subscription_admin_events: admin reads all"
  ON public.subscription_admin_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.subscription_admin_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.subscription_admin_events TO authenticated;
GRANT INSERT ON TABLE public.subscription_admin_events TO service_role;

COMMIT;
