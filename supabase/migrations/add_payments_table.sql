-- ============================================================
--  MIGRATION: add_payments_table
--
--  Creates a `payments` table to record PayMongo transactions.
--  Used for:
--    1. Idempotency — prevents double-subscription if the webhook
--       or verify-payment fires more than once for the same session.
--    2. Audit trail — keeps a log of all payments for admin review.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
--  Prerequisites: schema.sql (auth.users must exist)
-- ============================================================


-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paymongo_id     TEXT        NOT NULL UNIQUE,   -- checkout session ID from PayMongo
  amount          INT         NOT NULL,           -- in centavos (₱299 = 29900)
  currency        TEXT        NOT NULL DEFAULT 'PHP',
  duration_months INT         NOT NULL CHECK (duration_months IN (1, 3, 6)),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'paid', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);

COMMENT ON TABLE public.payments IS
  'PayMongo payment records. One row per checkout session. Used for idempotency and audit.';

COMMENT ON COLUMN public.payments.paymongo_id IS
  'PayMongo checkout session ID (cs_xxx). UNIQUE ensures idempotent processing.';

COMMENT ON COLUMN public.payments.amount IS
  'Amount charged in centavos (PHP). ₱299 = 29900.';


-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx  ON public.payments (status);


-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment history
CREATE POLICY "payments: read own"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "payments: admin reads all"
  ON public.payments
  FOR SELECT
  USING (public.is_admin());

-- NOTE: INSERT and UPDATE are performed exclusively by Edge Functions using the
-- service role key — no client-side write policies are granted intentionally.
-- This prevents a user from manually inserting a "paid" record to bypass payment.
