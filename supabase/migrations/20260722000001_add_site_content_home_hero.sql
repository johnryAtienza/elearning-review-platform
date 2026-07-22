-- ============================================================
--  MIGRATION: add_site_content_home_hero
--
--  Adds a tiny key/value CMS table for text-only landing hero copy.
--  Public users can read only the home_hero rows. Admins can manage rows.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_content (
  section    text        NOT NULL,
  key        text        NOT NULL,
  value      text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (section, key)
);

COMMENT ON TABLE public.site_content IS
  'Small key/value store for site copy. Currently used for landing home hero text only.';

DROP TRIGGER IF EXISTS trg_site_content_updated_at ON public.site_content;
CREATE TRIGGER trg_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_content: public reads home hero"
  ON public.site_content;
CREATE POLICY "site_content: public reads home hero"
  ON public.site_content
  FOR SELECT
  USING (
    section = 'home_hero'
    AND key IN ('eyebrow', 'title', 'description', 'primary_button', 'secondary_button')
  );

DROP POLICY IF EXISTS "site_content: admin all"
  ON public.site_content;
CREATE POLICY "site_content: admin all"
  ON public.site_content
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON TABLE public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.site_content TO authenticated;

INSERT INTO public.site_content (section, key, value)
VALUES
  ('home_hero', 'eyebrow',          'S Class Review'),
  ('home_hero', 'title',            'Pass the boards on your first attempt.'),
  ('home_hero', 'description',      'Daily multiple-choice drills, weekly catch-up sessions with a board topnotcher, and printed reviewers shipped nationwide. Six months of structured prep, one transparent plan.'),
  ('home_hero', 'primary_button',   'Enroll Now'),
  ('home_hero', 'secondary_button', 'Log in')
ON CONFLICT (section, key) DO NOTHING;
