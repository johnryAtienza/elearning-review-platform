-- ============================================================
--  MIGRATION: add_landing_contact_cta
--
--  Makes the landing page contact CTA text editable:
--    - title
--    - description
--    - button label
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
    OR (
      section = 'landing_contact_cta'
      AND key IN ('title', 'description', 'button_label')
    )
  );

INSERT INTO public.site_content (section, key, value)
VALUES
  ('landing_contact_cta', 'title', 'Contact us'),
  ('landing_contact_cta', 'description', 'Contact us for inquiries and payment instructions. We confirm enrolment within one business day and ship books nationwide.'),
  ('landing_contact_cta', 'button_label', 'Enroll Now')
ON CONFLICT (section, key) DO NOTHING;
