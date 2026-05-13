-- ============================================================
--  MIGRATION: add_books_and_orders
--
--  Adds the books e-commerce schema (Phase C).
--
--  Scope decisions locked in:
--  - Shipping: collect address only; offline fulfillment; admin
--    enters tracking number when shipped.
--  - Eligibility: anyone authenticated can purchase.
--  - Bundling: no relationship to subscriptions; books are a
--    standalone purchase.
--
--  Design decisions:
--  - Pricing source-of-truth lives in books.price_centavos.
--    Edge Functions read from DB at checkout time. No hardcoded
--    book prices in code.
--  - Stock is decremented atomically via decrement_book_stock()
--    inside the create-book-checkout Edge Function. Race-safe.
--  - book_orders.shipping_address is jsonb (free-text PH address
--    fields for v1; structured later if shipping rates are added).
--  - INSERT into book_orders is restricted to the service role
--    (Edge Function) — never directly from the browser. SELECT is
--    open to the row owner + admin. UPDATE is admin-only.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. books table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.books (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  author          text        NOT NULL DEFAULT '',
  isbn            text,
  description     text        NOT NULL DEFAULT '',
  cover_url       text,                                       -- R2 storage key, signed by Edge Function on demand
  price_centavos  int         NOT NULL CHECK (price_centavos >= 0),
  stock           int         NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_published    boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.books IS
  'Catalog of hardcopy books available for purchase. Price stored in centavos (PHP).';

COMMENT ON COLUMN public.books.cover_url IS
  'R2 storage key (e.g. covers/book-abc123.webp). Not a public URL — signed on demand if needed.';

COMMENT ON COLUMN public.books.price_centavos IS
  'Sale price in centavos (PHP). ₱500 = 50000.';

COMMENT ON COLUMN public.books.stock IS
  'Available units. Decremented via decrement_book_stock() at checkout creation.';


-- ── 2. book_orders table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.book_orders (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id               uuid        NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  qty                   int         NOT NULL DEFAULT 1 CHECK (qty >= 1),
  unit_price_centavos   int         NOT NULL CHECK (unit_price_centavos >= 0),
  total_centavos        int         NOT NULL CHECK (total_centavos >= 0),
  shipping_address      jsonb       NOT NULL,                 -- { fullName, phone, line1, line2, city, province, region, postalCode, notes }
  status                text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  paymongo_session_id   text        UNIQUE,                   -- nullable until checkout session is created
  tracking_no           text,
  ordered_at            timestamptz NOT NULL DEFAULT NOW(),
  paid_at               timestamptz,
  shipped_at            timestamptz,
  delivered_at          timestamptz,
  cancelled_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.book_orders IS
  'Book purchase orders. One row per order (single-book per order in v1; multi-item later).';

COMMENT ON COLUMN public.book_orders.unit_price_centavos IS
  'Price snapshot at order time. Books.price_centavos can change later without affecting historical orders.';

COMMENT ON COLUMN public.book_orders.shipping_address IS
  'Free-text PH address. Shape: { fullName, phone, line1, line2?, city, province, region, postalCode, notes? }.';

COMMENT ON COLUMN public.book_orders.paymongo_session_id IS
  'PayMongo checkout session ID (cs_xxx). UNIQUE ensures idempotent webhook + verify-payment processing.';


-- ── 3. Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS books_published_idx
  ON public.books (is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS book_orders_user_idx
  ON public.book_orders (user_id, ordered_at DESC);

CREATE INDEX IF NOT EXISTS book_orders_status_idx
  ON public.book_orders (status, ordered_at DESC);

CREATE INDEX IF NOT EXISTS book_orders_book_idx
  ON public.book_orders (book_id);


-- ── 4. updated_at triggers (matches existing lessons / courses) ─
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_book_orders_updated_at
  BEFORE UPDATE ON public.book_orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ── 5. decrement_book_stock RPC (race-safe) ────────────────────
-- Returns true on success, false if insufficient stock.
-- Locks the books row inside the function; safe under concurrent
-- checkouts. Called from create-book-checkout Edge Function.
CREATE OR REPLACE FUNCTION public.decrement_book_stock(
  p_book_id uuid,
  p_qty     int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock int;
BEGIN
  -- Lock the row for the duration of this transaction
  SELECT stock INTO v_stock
  FROM public.books
  WHERE id = p_book_id
  FOR UPDATE;

  IF v_stock IS NULL THEN
    RETURN false;
  END IF;

  IF v_stock < p_qty THEN
    RETURN false;
  END IF;

  UPDATE public.books
  SET stock = stock - p_qty
  WHERE id = p_book_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.decrement_book_stock IS
  'Atomic stock decrement. Returns false if book missing or insufficient stock.
   Called from create-book-checkout Edge Function inside its transaction.';


-- ── 6. restock_book RPC (used when an order is cancelled) ──────
CREATE OR REPLACE FUNCTION public.restock_book(
  p_book_id uuid,
  p_qty     int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.books
  SET stock = stock + p_qty
  WHERE id = p_book_id;
END;
$$;

COMMENT ON FUNCTION public.restock_book IS
  'Restore book stock when an order is cancelled (admin action).';


-- ── 7. Row Level Security ──────────────────────────────────────
ALTER TABLE public.books       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_orders ENABLE ROW LEVEL SECURITY;


-- ── 7a. books: public catalog (published only) + admin full CRUD
DROP POLICY IF EXISTS "books: anyone reads published"  ON public.books;
DROP POLICY IF EXISTS "books: admin reads all"         ON public.books;
DROP POLICY IF EXISTS "books: admin insert"            ON public.books;
DROP POLICY IF EXISTS "books: admin update"            ON public.books;
DROP POLICY IF EXISTS "books: admin delete"            ON public.books;

CREATE POLICY "books: anyone reads published"
  ON public.books
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "books: admin reads all"
  ON public.books
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "books: admin insert"
  ON public.books
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "books: admin update"
  ON public.books
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "books: admin delete"
  ON public.books
  FOR DELETE
  USING (public.is_admin());


-- ── 7b. book_orders: user reads own + admin full CRUD ──────────
-- INSERT is intentionally NOT granted to regular users — orders
-- are created exclusively by the create-book-checkout Edge Function
-- (which uses the service role key and bypasses RLS).
DROP POLICY IF EXISTS "book_orders: user reads own"  ON public.book_orders;
DROP POLICY IF EXISTS "book_orders: admin reads all" ON public.book_orders;
DROP POLICY IF EXISTS "book_orders: admin update"    ON public.book_orders;

CREATE POLICY "book_orders: user reads own"
  ON public.book_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "book_orders: admin reads all"
  ON public.book_orders
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "book_orders: admin update"
  ON public.book_orders
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
