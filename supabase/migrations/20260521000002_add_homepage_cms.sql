-- ============================================================
--  MIGRATION: add_homepage_cms
--
--  Adds DB-backed CMS for the public homepage's two dynamic blocks:
--    1. announcements        — the timeline cards on the left
--    2. welcome_videos       — the welcome/intro video card on the right
--
--  Design decisions:
--  - Separate tables (not a polymorphic content_blocks table). The two
--    blocks have different shapes and different admin workflows; a generic
--    JSONB store would buy us flexibility we don't need today and pay an
--    indexing/typing tax forever. If the LMS later grows to 8+ block types
--    of similar shape, a content_blocks table can be introduced alongside.
--
--  - Two read paths:
--      * announcements_public / welcome_videos_public  — views readable by
--        anon (logged-out homepage). Filter to enabled + (for announcements)
--        published_at <= now().
--      * Base tables                                   — admin-only writes
--        and full reads via the is_admin() RLS guard.
--
--  - published_at supports future-dated drafts ("schedule for May 1").
--    The public view filters published_at <= now(); enabled=true with a
--    future published_at stays hidden until that moment.
--
--  - thumbnail_key on welcome_videos stores the R2 object key
--    (e.g. cms/welcome-video-<uuid>.webp), proxied to the public domain via
--    /cdn/ at render time. Matches the books.cover_url convention.
--
--  - On the homepage, only the top welcome_video (lowest display_order,
--    enabled=true) is rendered. The table supports many rows so admins can
--    keep alternates ready to swap in.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. announcements table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  body            text        NOT NULL DEFAULT '',
  published_at    timestamptz NOT NULL DEFAULT NOW(),     -- sort + scheduling
  enabled         boolean     NOT NULL DEFAULT true,
  cta_label       text,
  cta_href        text,
  icon            text,                                    -- lucide icon name, optional
  category        text,                                    -- 'eng-math' | 'machine-design' | …
  display_order   int         NOT NULL DEFAULT 0,          -- secondary sort, lower = higher
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  -- CTA fields are both-or-neither: a label without a link (or vice versa) is nonsense.
  CONSTRAINT announcements_cta_paired CHECK ((cta_label IS NULL) = (cta_href IS NULL))
);

COMMENT ON TABLE public.announcements IS
  'Homepage announcement cards. Admin-managed. Sorted by display_order ASC, then published_at DESC.';

COMMENT ON COLUMN public.announcements.published_at IS
  'When the announcement becomes visible. Future timestamps schedule the post.';

COMMENT ON COLUMN public.announcements.category IS
  'Optional free-form tag for filtering/grouping (e.g. ''eng-math''). Not a FK.';

-- Partial index for the hot public-read query (only enabled rows).
CREATE INDEX IF NOT EXISTS announcements_public_idx
  ON public.announcements (display_order ASC, published_at DESC)
  WHERE enabled = true;


-- ── 2. welcome_videos table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.welcome_videos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  description     text        NOT NULL DEFAULT '',
  video_url       text,                                    -- YouTube / Vimeo / R2 mp4 URL; NULL = show thumbnail only
  thumbnail_url   text,                                    -- public CDN URL or /public path (e.g. /elearning-logo-transparent.png)
  cta_label       text,
  cta_href        text,
  enabled         boolean     NOT NULL DEFAULT true,
  display_order   int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT welcome_videos_cta_paired CHECK ((cta_label IS NULL) = (cta_href IS NULL))
);

COMMENT ON TABLE public.welcome_videos IS
  'Homepage welcome/intro video card. Multiple rows allowed; only the top enabled row renders.';

COMMENT ON COLUMN public.welcome_videos.thumbnail_url IS
  'Public CDN URL of the thumbnail (uploaded via storageClient → result.publicUrl). Marketing asset, no signing needed.';

CREATE INDEX IF NOT EXISTS welcome_videos_public_idx
  ON public.welcome_videos (display_order ASC, created_at DESC)
  WHERE enabled = true;


-- ── 3. updated_at triggers ─────────────────────────────────────
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_welcome_videos_updated_at
  BEFORE UPDATE ON public.welcome_videos
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ── 4. Public read views (anon-readable) ───────────────────────
-- Views are SECURITY INVOKER by default but bypass the base tables' RLS
-- because the view owner (postgres) implicitly grants access. Granting
-- SELECT to anon + authenticated is what makes the homepage queries work
-- for logged-out users.

CREATE OR REPLACE VIEW public.announcements_public AS
  SELECT
    id, title, body, published_at,
    cta_label, cta_href, icon, category, display_order
  FROM public.announcements
  WHERE enabled = true
    AND published_at <= NOW();

COMMENT ON VIEW public.announcements_public IS
  'Public-facing announcements. Filters enabled + published_at <= now(). Anon-readable.';

CREATE OR REPLACE VIEW public.welcome_videos_public AS
  SELECT
    id, title, description, video_url, thumbnail_url,
    cta_label, cta_href, display_order
  FROM public.welcome_videos
  WHERE enabled = true;

COMMENT ON VIEW public.welcome_videos_public IS
  'Public-facing welcome videos. Filters enabled=true. Anon-readable.';

GRANT SELECT ON public.announcements_public  TO anon, authenticated;
GRANT SELECT ON public.welcome_videos_public TO anon, authenticated;


-- ── 5. Row-level security on base tables ───────────────────────
ALTER TABLE public.announcements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_videos  ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on the base tables. Non-admins read via the
-- public views above; they have NO direct access to base tables.
CREATE POLICY "announcements: admin all"
  ON public.announcements
  FOR ALL
  USING     (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "welcome_videos: admin all"
  ON public.welcome_videos
  FOR ALL
  USING     (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── 6. Seed: carry over the three hardcoded announcements ──────
-- These match what was in src/constants/announcements.ts. Safe to keep
-- here so production isn't blank immediately after the migration runs.
INSERT INTO public.announcements (title, body, published_at, display_order)
VALUES
  (
    'May intake now open',
    'Enrol any time in May. Daily MC drills and weekly catch-up sessions start the day after your subscription is activated.',
    '2026-05-01T00:00:00Z',
    0
  ),
  (
    'New: Power & Industrial Plant track',
    'Five-week curriculum covering thermodynamics, fuels, boilers, turbines, and refrigeration — now available as part of the Full Mechanical Engineering Review.',
    '2026-04-22T00:00:00Z',
    0
  ),
  (
    'Hard-copy books shipping nationwide',
    'Engineering Mathematics, Machine Design, and Power & Industrial Plant Engineering reviewers are printed and ready. We ship to all PH provinces within 5 business days.',
    '2026-04-08T00:00:00Z',
    0
  );


-- ── 7. Seed: default welcome video card ────────────────────────
-- No video URL yet; the homepage falls back to the logo thumbnail.
INSERT INTO public.welcome_videos (title, description, video_url, thumbnail_url, display_order)
VALUES
  (
    'Why S Class?',
    'Watch a short intro on how the program works and what''s included with every package.',
    NULL,
    '/elearning-logo-transparent.png',
    0
  );
