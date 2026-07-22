-- ============================================================
--  MIGRATION: add_contact_channels
--
--  Moves Contact page cards into dynamic rows.
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
    OR (
      section = 'who_we_are_page'
      AND key IN ('eyebrow', 'title')
    )
    OR (
      section = 'faq_page'
      AND key IN (
        'eyebrow',
        'title',
        'description',
        'cta_title',
        'cta_description',
        'cta_button_label'
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.contact_channels (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text        NOT NULL,
  value       text        NOT NULL,
  helper_text text        NOT NULL DEFAULT '',
  href        text        NOT NULL,
  icon        text        NOT NULL DEFAULT 'link',
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contact_channels IS
  'Public Contact page channel cards. Admin-managed; public reads active rows only.';

ALTER TABLE public.contact_channels
  DROP CONSTRAINT IF EXISTS contact_channels_icon_check;
ALTER TABLE public.contact_channels
  ADD CONSTRAINT contact_channels_icon_check
  CHECK (icon IN ('email', 'phone', 'messenger', 'facebook', 'link'));

CREATE INDEX IF NOT EXISTS contact_channels_public_idx
  ON public.contact_channels (sort_order ASC, created_at ASC)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_contact_channels_updated_at ON public.contact_channels;
CREATE TRIGGER trg_contact_channels_updated_at
  BEFORE UPDATE ON public.contact_channels
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.contact_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_channels: public read active"
  ON public.contact_channels;
CREATE POLICY "contact_channels: public read active"
  ON public.contact_channels
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "contact_channels: admin all"
  ON public.contact_channels;
CREATE POLICY "contact_channels: admin all"
  ON public.contact_channels
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.contact_channels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contact_channels TO authenticated;

INSERT INTO public.contact_channels (
  id,
  label,
  value,
  helper_text,
  href,
  icon,
  sort_order,
  is_active
)
VALUES
  (
    '66666666-6666-4666-8666-666666666661',
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'email_label'), 'Email us'),
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'email_value'), 'hello@class-s.ph'),
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'email_helper'), 'We reply within one business day.'),
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'email_href'), 'mailto:hello@class-s.ph'),
    'email',
    0,
    true
  ),
  (
    '66666666-6666-4666-8666-666666666662',
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'phone_label'), 'Call us'),
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'phone_value'), '+63 917 000 0000'),
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'phone_helper'), 'Mon–Sat, 9:00 AM – 6:00 PM (PHT).'),
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'phone_href'), 'tel:+639170000000'),
    'phone',
    1,
    true
  ),
  (
    '66666666-6666-4666-8666-666666666663',
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'messenger_label'), 'Facebook Messenger'),
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'messenger_value'), 'm.me/classsreview'),
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'messenger_helper'), 'Fastest channel for quick questions.'),
    COALESCE((SELECT value FROM public.site_content WHERE section = 'contact_page' AND key = 'messenger_href'), 'https://m.me/classsreview'),
    'messenger',
    2,
    true
  )
ON CONFLICT (id) DO NOTHING;
