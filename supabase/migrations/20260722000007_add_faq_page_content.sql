-- ============================================================
--  MIGRATION: add_faq_page_content
--
--  Makes the public FAQ page editable:
--    - page header and bottom CTA copy in site_content
--    - FAQ category/question/answer rows in faqs
--    - public reads active FAQ rows only
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
      AND key IN (
        'eyebrow',
        'title',
        'who_are_we_label',
        'who_are_we_body',
        'review_philosophy_label',
        'review_philosophy_body',
        'mission_label',
        'mission_body',
        'vision_label',
        'vision_body'
      )
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

INSERT INTO public.site_content (section, key, value)
VALUES
  ('faq_page', 'eyebrow', 'FAQ'),
  ('faq_page', 'title', 'Frequently asked questions'),
  ('faq_page', 'description', 'Quick answers about enrolment, content access, books, and your account.'),
  ('faq_page', 'cta_title', 'Still have questions?'),
  ('faq_page', 'cta_description', 'We reply within one business day across email, phone, and Messenger.'),
  ('faq_page', 'cta_button_label', 'Contact us')
ON CONFLICT (section, key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.faqs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category   text        NOT NULL,
  question   text        NOT NULL,
  answer     text        NOT NULL,
  sort_order int         NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.faqs IS
  'Public FAQ page items. Admin-managed; public reads active rows only.';

CREATE INDEX IF NOT EXISTS faqs_public_idx
  ON public.faqs (sort_order ASC, created_at ASC)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_faqs_updated_at ON public.faqs;
CREATE TRIGGER trg_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE VIEW public.faqs_state AS
  SELECT COUNT(*)::int AS total_count
  FROM public.faqs;

GRANT SELECT ON public.faqs_state TO anon, authenticated;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faqs: public read active"
  ON public.faqs;
CREATE POLICY "faqs: public read active"
  ON public.faqs
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "faqs: admin all"
  ON public.faqs;
CREATE POLICY "faqs: admin all"
  ON public.faqs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;

INSERT INTO public.faqs (
  id,
  category,
  question,
  answer,
  sort_order,
  is_active
)
VALUES
  (
    '77777777-7777-4777-8777-777777777701',
    'Enrollment',
    'How do I enrol in a S Class review?',
    'Pick a package on the Home page, click Enroll Now, and complete payment via GCash, Maya, or card. Your online access is activated immediately; printed books ship within 5 business days.',
    0,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777702',
    'Enrollment',
    'How long is the online access valid?',
    'Every standard package includes 6 months of online access from the date of activation. Renewing before your access expires stacks the new months on top — no days lost.',
    1,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777703',
    'Enrollment',
    'Can I switch packages after enrolling?',
    'Yes — message us via the Contact Us page and we will arrange the upgrade. Any unused time on your current package carries over.',
    2,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777704',
    'Access & content',
    'What is included on Day 1 of each course?',
    'Day 1 of every course is fully open to all logged-in users — full-length video, full PDF, and the quiz — so you can sample the experience before subscribing.',
    3,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777705',
    'Access & content',
    'Why am I blocked on Day 2 onwards?',
    'Day 2 onwards is part of the Standard package. Click Enroll Now on any locked Day card to subscribe and unlock the full curriculum.',
    4,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777706',
    'Access & content',
    'Are quiz answers reviewed after I submit?',
    'Yes — Standard plan members see the correct answer and explanation after submitting each quiz. Free users see their score only.',
    5,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777707',
    'Books & shipping',
    'Do you ship outside Metro Manila?',
    'Yes — we ship to all PH provinces within 5 business days of payment confirmation.',
    6,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777708',
    'Books & shipping',
    'What if my book arrives damaged?',
    'Email us photos of the damage within 7 days of delivery and we will arrange a replacement at no cost.',
    7,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777709',
    'Books & shipping',
    'Can I buy a book without enrolling in the review?',
    'Yes — printed books can be purchased separately from the Books tab.',
    8,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777710',
    'Payments',
    'What payment methods do you accept?',
    'GCash, Maya, and major credit/debit cards (Visa, Mastercard, JCB) — all processed securely through PayMongo.',
    9,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777711',
    'Payments',
    'Is there a refund policy?',
    'Online access is non-refundable once activated. Unopened books may be returned within 7 days for a refund of the book price (shipping is non-refundable).',
    10,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777712',
    'Account & devices',
    'Can I log in on multiple devices?',
    'Yes — one mobile device and one laptop/desktop per account. If you try to log in on a third device, you will be asked to sign out from one of your existing devices first.',
    11,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777713',
    'Account & devices',
    'I forgot my password — what do I do?',
    'Click "Log in" → "Forgot password?". Enter your email and we will send a reset link.',
    12,
    true
  )
ON CONFLICT (id) DO NOTHING;
