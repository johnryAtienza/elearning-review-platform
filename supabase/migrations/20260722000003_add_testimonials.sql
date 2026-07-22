-- ============================================================
--  MIGRATION: add_testimonials
--
--  Makes the "What Our Reviewers Say" homepage section editable:
--    - section eyebrow + heading in site_content
--    - testimonial/reviewer cards in testimonials
--    - public reads active rows only
-- ============================================================

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
    OR (
      section = 'testimonials'
      AND key IN ('eyebrow', 'heading')
    )
  );

INSERT INTO public.site_content (section, key, value)
VALUES
  ('testimonials', 'eyebrow', 'What Our Reviewers Say'),
  ('testimonials', 'heading', 'Real results from real candidates')
ON CONFLICT (section, key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.testimonials (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  initials   text        NOT NULL,
  title      text        NOT NULL,
  affiliation text       NOT NULL DEFAULT '',
  quote      text        NOT NULL,
  rating     int         NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  sort_order int         NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.testimonials IS
  'Homepage testimonial/reviewer story cards. Admin-managed; public reads active rows only.';

CREATE INDEX IF NOT EXISTS testimonials_public_idx
  ON public.testimonials (sort_order ASC, created_at ASC)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_testimonials_updated_at ON public.testimonials;
CREATE TRIGGER trg_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE VIEW public.testimonials_state AS
  SELECT COUNT(*)::int AS total_count
  FROM public.testimonials;

GRANT SELECT ON public.testimonials_state TO anon, authenticated;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonials: public read active"
  ON public.testimonials;
CREATE POLICY "testimonials: public read active"
  ON public.testimonials
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "testimonials: admin all"
  ON public.testimonials;
CREATE POLICY "testimonials: admin all"
  ON public.testimonials
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;

INSERT INTO public.testimonials (
  id,
  name,
  initials,
  title,
  affiliation,
  quote,
  rating,
  sort_order,
  is_active
)
VALUES
  (
    '55555555-5555-4555-8555-555555555551',
    'Juan Dela Cruz',
    'JD',
    'Mechanical Engineering Board Topnotcher 2025',
    U&'University of the Philippines \2014 Diliman',
    'The daily MC drills and topnotcher catch-up sessions kept me sharp every single week. Walking into the boards I felt prepared, not anxious.',
    5,
    0,
    true
  ),
  (
    '55555555-5555-4555-8555-555555555552',
    'Maria Santos',
    'MS',
    'Mechanical Engineering Licensee, April 2025',
    'Mapua University',
    U&'I struggled with Engineering Math for years. S Class''s video explainers finally made the concepts click \2014 and the printed reviewer is dog-eared from how often I used it.',
    5,
    1,
    true
  ),
  (
    '55555555-5555-4555-8555-555555555553',
    'Andrew Reyes',
    'AR',
    'Mechanical Engineering Licensee, October 2024',
    'Technological Institute of the Philippines',
    'Six months of structured review beats six months of cramming. The weekly exams kept me accountable; the catch-up sessions filled every gap I had.',
    5,
    2,
    true
  )
ON CONFLICT (id) DO NOTHING;
