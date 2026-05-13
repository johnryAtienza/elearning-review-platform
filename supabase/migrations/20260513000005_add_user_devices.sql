-- ============================================================
--  MIGRATION: add_user_devices
--
--  Netflix-style hard cap: 1 mobile + 1 desktop per account.
--
--  Concurrency safety:
--    - UNIQUE(user_id, fingerprint) prevents duplicate rows for the
--      same device.
--    - Partial UNIQUE INDEX (user_id, device_kind) WHERE is_active
--      prevents two active rows of the same kind from being inserted
--      simultaneously — the second concurrent transaction errors out
--      and the Edge Function returns limit_reached.
--
--  Idempotent: re-running this migration after a partial run is safe.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
--           (or `supabase db push` if all migrations have timestamp prefixes)
-- ============================================================


-- ── 1. user_devices table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_devices (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint    text        NOT NULL,                                 -- FingerprintJS visitorId
  device_kind    text        NOT NULL CHECK (device_kind IN ('mobile', 'desktop')),
  user_agent     text        NOT NULL DEFAULT '',
  ip             text,
  /** Human-readable label set by the user (e.g. "John's iPhone"). Optional. */
  label          text,
  is_active      boolean     NOT NULL DEFAULT true,
  first_seen_at  timestamptz NOT NULL DEFAULT NOW(),
  last_seen_at   timestamptz NOT NULL DEFAULT NOW(),
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  updated_at     timestamptz NOT NULL DEFAULT NOW(),

  -- Identical device on the same account is one row, not many. Allows
  -- the register-device Edge Function to "re-touch" an existing row.
  UNIQUE (user_id, fingerprint)
);

COMMENT ON TABLE public.user_devices IS
  'Tracks devices each user has logged in on. Hard cap of 1 mobile + 1 desktop per user is enforced
   by the create-device Edge Function plus the partial UNIQUE index defined below.';

COMMENT ON COLUMN public.user_devices.fingerprint IS
  'FingerprintJS visitorId. Stable across reloads on the same browser/device, but can drift on
   major browser/OS updates — false-rejection risk is mitigated by the "Sign out other devices" UI.';

COMMENT ON COLUMN public.user_devices.device_kind IS
  'Classification derived from the User-Agent string at registration time: mobile | desktop.';


-- ── 2. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS user_devices_user_active_idx
  ON public.user_devices (user_id, is_active);

-- Hard cap enforcement: only one active device row per (user, kind).
-- A second concurrent INSERT errors at the index, not at app level.
CREATE UNIQUE INDEX IF NOT EXISTS user_devices_active_one_per_kind_idx
  ON public.user_devices (user_id, device_kind)
  WHERE is_active = true;


-- ── 3. updated_at trigger ─────────────────────────────────────
DROP TRIGGER IF EXISTS trg_user_devices_updated_at ON public.user_devices;

CREATE TRIGGER trg_user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ── 4. Row Level Security ─────────────────────────────────────
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Reads: user reads own. Admins additionally read all.
DROP POLICY IF EXISTS "user_devices: user reads own"  ON public.user_devices;
DROP POLICY IF EXISTS "user_devices: admin reads all" ON public.user_devices;

CREATE POLICY "user_devices: user reads own"
  ON public.user_devices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_devices: admin reads all"
  ON public.user_devices
  FOR SELECT
  USING (public.is_admin());

-- Writes (INSERT / UPDATE / DELETE) are NOT granted to regular users.
-- All mutations go through the register-device + revoke-device Edge
-- Functions, which use the service role key and bypass RLS.
