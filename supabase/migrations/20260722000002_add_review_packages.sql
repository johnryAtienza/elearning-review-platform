-- ============================================================
--  MIGRATION: add_review_packages
--
--  Makes the "Review Classes Offered" homepage section editable:
--    - section eyebrow + heading in site_content
--    - normalized review package cards
--    - package-level features
--    - optional package variants and their features
-- ============================================================

-- Public site_content reads now include the review classes copy.
DROP POLICY IF EXISTS "site_content: public reads home hero"
  ON public.site_content;
DROP POLICY IF EXISTS "site_content: public reads public home copy"
  ON public.site_content;

CREATE POLICY "site_content: public reads public home copy"
  ON public.site_content
  FOR SELECT
  USING (
    (
      section = 'home_hero'
      AND key IN ('eyebrow', 'title', 'description', 'primary_button', 'secondary_button')
    )
    OR (
      section = 'home_review_classes'
      AND key IN ('eyebrow', 'heading')
    )
  );

INSERT INTO public.site_content (section, key, value)
VALUES
  ('home_review_classes', 'eyebrow', 'Review Classes Offered'),
  ('home_review_classes', 'heading', 'Pick the package that fits your reviewer')
ON CONFLICT (section, key) DO NOTHING;

-- Review package cards.
CREATE TABLE IF NOT EXISTS public.review_packages (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                text        NOT NULL,
  description          text        NOT NULL DEFAULT '',
  badge                text,
  price                text,
  online_access_months int         NOT NULL DEFAULT 6 CHECK (online_access_months > 0),
  sort_order           int         NOT NULL DEFAULT 0,
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.review_packages IS
  'Homepage review class package cards. Admin-managed; public reads active rows only.';

CREATE INDEX IF NOT EXISTS review_packages_public_idx
  ON public.review_packages (sort_order ASC, created_at ASC)
  WHERE is_active = true;

-- Package-level inclusions/features.
CREATE TABLE IF NOT EXISTS public.review_package_features (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id   uuid        NOT NULL REFERENCES public.review_packages(id) ON DELETE CASCADE,
  feature_text text        NOT NULL,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_package_features_package_idx
  ON public.review_package_features (package_id, sort_order ASC);

-- Optional package variants.
CREATE TABLE IF NOT EXISTS public.review_package_options (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid        NOT NULL REFERENCES public.review_packages(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  price      text        NOT NULL DEFAULT '',
  sort_order int         NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_package_options_public_idx
  ON public.review_package_options (package_id, sort_order ASC)
  WHERE is_active = true;

-- Variant inclusions/features.
CREATE TABLE IF NOT EXISTS public.review_package_option_features (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id    uuid        NOT NULL REFERENCES public.review_package_options(id) ON DELETE CASCADE,
  feature_text text        NOT NULL,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_package_option_features_option_idx
  ON public.review_package_option_features (option_id, sort_order ASC);

-- updated_at triggers.
DROP TRIGGER IF EXISTS trg_review_packages_updated_at ON public.review_packages;
CREATE TRIGGER trg_review_packages_updated_at
  BEFORE UPDATE ON public.review_packages
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_review_package_features_updated_at ON public.review_package_features;
CREATE TRIGGER trg_review_package_features_updated_at
  BEFORE UPDATE ON public.review_package_features
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_review_package_options_updated_at ON public.review_package_options;
CREATE TRIGGER trg_review_package_options_updated_at
  BEFORE UPDATE ON public.review_package_options
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_review_package_option_features_updated_at ON public.review_package_option_features;
CREATE TRIGGER trg_review_package_option_features_updated_at
  BEFORE UPDATE ON public.review_package_option_features
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Public state view lets the client distinguish an intentionally inactive
-- section from a brand-new empty table that should use defaults.
CREATE OR REPLACE VIEW public.review_packages_state AS
  SELECT COUNT(*)::int AS total_count
  FROM public.review_packages;

GRANT SELECT ON public.review_packages_state TO anon, authenticated;

-- Row-level security.
ALTER TABLE public.review_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_package_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_package_option_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_packages: public read active"
  ON public.review_packages;
CREATE POLICY "review_packages: public read active"
  ON public.review_packages
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "review_packages: admin all"
  ON public.review_packages;
CREATE POLICY "review_packages: admin all"
  ON public.review_packages
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "review_package_features: public read active package"
  ON public.review_package_features;
CREATE POLICY "review_package_features: public read active package"
  ON public.review_package_features
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.review_packages p
      WHERE p.id = review_package_features.package_id
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "review_package_features: admin all"
  ON public.review_package_features;
CREATE POLICY "review_package_features: admin all"
  ON public.review_package_features
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "review_package_options: public read active option"
  ON public.review_package_options;
CREATE POLICY "review_package_options: public read active option"
  ON public.review_package_options
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.review_packages p
      WHERE p.id = review_package_options.package_id
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "review_package_options: admin all"
  ON public.review_package_options;
CREATE POLICY "review_package_options: admin all"
  ON public.review_package_options
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "review_package_option_features: public read active option"
  ON public.review_package_option_features;
CREATE POLICY "review_package_option_features: public read active option"
  ON public.review_package_option_features
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.review_package_options o
      JOIN public.review_packages p ON p.id = o.package_id
      WHERE o.id = review_package_option_features.option_id
        AND o.is_active = true
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "review_package_option_features: admin all"
  ON public.review_package_option_features;
CREATE POLICY "review_package_option_features: admin all"
  ON public.review_package_option_features
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.review_packages TO anon, authenticated;
GRANT SELECT ON public.review_package_features TO anon, authenticated;
GRANT SELECT ON public.review_package_options TO anon, authenticated;
GRANT SELECT ON public.review_package_option_features TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.review_packages TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.review_package_features TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.review_package_options TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.review_package_option_features TO authenticated;

-- Seed: current hardcoded review packages.
INSERT INTO public.review_packages (
  id, title, description, badge, price, online_access_months, sort_order, is_active
)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'Full Mechanical Engineering Review',
    'The complete board-prep package. All three reviewer books plus six months of online access and weekly topnotcher catch-up sessions.',
    'Most Complete',
    'Php x,xxx',
    6,
    0,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Engineering Mathematics Special Review',
    U&'For any engineering course. Choose the package that fits how you study \2014 printed reviewer included, or online-only.',
    NULL,
    NULL,
    6,
    1,
    true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.review_package_features (id, package_id, feature_text, sort_order)
VALUES
  ('11111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111111', 'Engineering Mathematics book (hard copy)', 0),
  ('11111111-1111-4111-8111-111111111102', '11111111-1111-4111-8111-111111111111', 'Machine Design book (hard copy)', 1),
  ('11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111111', 'Power and Industrial Plant Engineering book (hard copy)', 2),
  ('11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111111', 'Video book explainer for all subjects', 3),
  ('11111111-1111-4111-8111-111111111105', '11111111-1111-4111-8111-111111111111', U&'Daily Multiple Choice Practice Problems (Engineering Math) \2014 with complete solutions', 4),
  ('11111111-1111-4111-8111-111111111106', '11111111-1111-4111-8111-111111111111', U&'Weekly Multiple Choice Practice Problems (Engineering Math) \2014 with complete solutions', 5),
  ('11111111-1111-4111-8111-111111111107', '11111111-1111-4111-8111-111111111111', U&'Daily Multiple Choice Elements (Engineering Math) \2014 with complete solutions', 6),
  ('11111111-1111-4111-8111-111111111108', '11111111-1111-4111-8111-111111111111', U&'Daily Multiple Choice Elements \2014 terminologies and concepts', 7),
  ('11111111-1111-4111-8111-111111111109', '11111111-1111-4111-8111-111111111111', 'Weekly online catch-up sessions with a board topnotcher (1st Place!!)', 8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.review_package_options (id, package_id, title, price, sort_order, is_active)
VALUES
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', U&'Option 1 \2014 with reviewer book', 'Php x,xxx', 0, true),
  ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', U&'Option 2 \2014 online only', 'Php x,xxx', 1, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.review_package_option_features (id, option_id, feature_text, sort_order)
VALUES
  ('33333333-3333-4333-8333-333333333301', '33333333-3333-4333-8333-333333333333', 'Engineering Mathematics book (hard copy)', 0),
  ('33333333-3333-4333-8333-333333333302', '33333333-3333-4333-8333-333333333333', 'Video book explainer (Engineering Math)', 1),
  ('33333333-3333-4333-8333-333333333303', '33333333-3333-4333-8333-333333333333', U&'Daily MC Practice Problems (Engineering Math) \2014 with complete solutions', 2),
  ('33333333-3333-4333-8333-333333333304', '33333333-3333-4333-8333-333333333333', U&'Daily MC Elements (Engineering Math) \2014 with complete solutions', 3),
  ('33333333-3333-4333-8333-333333333305', '33333333-3333-4333-8333-333333333333', U&'Daily MC Elements \2014 terminologies and concepts', 4),
  ('44444444-4444-4444-8444-444444444401', '44444444-4444-4444-8444-444444444444', 'Video book explainer (Engineering Math)', 0),
  ('44444444-4444-4444-8444-444444444402', '44444444-4444-4444-8444-444444444444', U&'Daily MC Practice Problems (Engineering Math) \2014 with complete solutions', 1),
  ('44444444-4444-4444-8444-444444444403', '44444444-4444-4444-8444-444444444444', U&'Daily MC Elements \2014 terminologies and concepts', 2)
ON CONFLICT (id) DO NOTHING;
