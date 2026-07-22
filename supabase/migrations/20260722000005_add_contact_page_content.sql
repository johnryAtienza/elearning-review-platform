-- ============================================================
--  MIGRATION: add_contact_page_content
--
--  Makes the public Contact page text, links, and business hours editable.
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
    OR (
      section = 'contact_page'
      AND key IN (
        'hero_eyebrow',
        'hero_title',
        'hero_description',
        'email_label',
        'email_value',
        'email_helper',
        'email_href',
        'phone_label',
        'phone_value',
        'phone_helper',
        'phone_href',
        'messenger_label',
        'messenger_value',
        'messenger_helper',
        'messenger_href',
        'business_hours_weekdays',
        'business_hours_saturday',
        'business_hours_sunday'
      )
    )
  );

INSERT INTO public.site_content (section, key, value)
VALUES
  ('contact_page', 'hero_eyebrow', 'Contact us'),
  ('contact_page', 'hero_title', 'Talk to a S Class reviewer'),
  ('contact_page', 'hero_description', 'Questions about enrolment, books, or the platform? Reach out via any of the channels below — we read every message and reply within one business day.'),
  ('contact_page', 'email_label', 'Email us'),
  ('contact_page', 'email_value', 'hello@class-s.ph'),
  ('contact_page', 'email_helper', 'We reply within one business day.'),
  ('contact_page', 'email_href', 'mailto:hello@class-s.ph'),
  ('contact_page', 'phone_label', 'Call us'),
  ('contact_page', 'phone_value', '+63 917 000 0000'),
  ('contact_page', 'phone_helper', 'Mon–Sat, 9:00 AM – 6:00 PM (PHT).'),
  ('contact_page', 'phone_href', 'tel:+639170000000'),
  ('contact_page', 'messenger_label', 'Facebook Messenger'),
  ('contact_page', 'messenger_value', 'm.me/classsreview'),
  ('contact_page', 'messenger_helper', 'Fastest channel for quick questions.'),
  ('contact_page', 'messenger_href', 'https://m.me/classsreview'),
  ('contact_page', 'business_hours_weekdays', '9:00 AM – 6:00 PM'),
  ('contact_page', 'business_hours_saturday', '9:00 AM – 1:00 PM'),
  ('contact_page', 'business_hours_sunday', 'Closed')
ON CONFLICT (section, key) DO NOTHING;
