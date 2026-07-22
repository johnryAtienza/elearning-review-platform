-- ============================================================
--  MIGRATION: add_who_we_are_dynamic_sections
--
--  Moves the Who We Are page body sections into dynamic rows.
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

INSERT INTO public.site_content (section, key, value)
VALUES
  ('who_we_are_page', 'eyebrow', 'Who We Are'),
  ('who_we_are_page', 'title', 'A focused board exam review program')
ON CONFLICT (section, key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.who_we_are_sections (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  body       text        NOT NULL,
  sort_order int         NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.who_we_are_sections IS
  'Public Who We Are page sections. Admin-managed; public reads active rows only.';

CREATE INDEX IF NOT EXISTS who_we_are_sections_public_idx
  ON public.who_we_are_sections (sort_order ASC, created_at ASC)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_who_we_are_sections_updated_at ON public.who_we_are_sections;
CREATE TRIGGER trg_who_we_are_sections_updated_at
  BEFORE UPDATE ON public.who_we_are_sections
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE VIEW public.who_we_are_sections_state AS
  SELECT COUNT(*)::int AS total_count
  FROM public.who_we_are_sections;

GRANT SELECT ON public.who_we_are_sections_state TO anon, authenticated;

ALTER TABLE public.who_we_are_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "who_we_are_sections: public read active"
  ON public.who_we_are_sections;
CREATE POLICY "who_we_are_sections: public read active"
  ON public.who_we_are_sections
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "who_we_are_sections: admin all"
  ON public.who_we_are_sections;
CREATE POLICY "who_we_are_sections: admin all"
  ON public.who_we_are_sections
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.who_we_are_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.who_we_are_sections TO authenticated;

WITH section_values (
  id,
  title_key,
  body_key,
  sort_order,
  default_title,
  default_body
) AS (
  VALUES
    (
      '77777777-7777-4777-8777-777777777771'::uuid,
      'who_are_we_label',
      'who_are_we_body',
      0,
      'Who Are We',
      'S Class Review is a focused board exam review program for Filipino mechanical engineering candidates. We pair printed reviewer books with an always-on online platform — daily problem solutions, weekly drills, and topnotcher-led catch-up sessions — so reviewers can keep momentum whether they study at home, on a commute, or between work shifts.'
    ),
    (
      '77777777-7777-4777-8777-777777777772'::uuid,
      'review_philosophy_label',
      'review_philosophy_body',
      1,
      'Review Philosophy',
      'Pass rates rise when reviewers practise consistently, not heroically. Our daily MC drills, weekly mock exams, and worked solutions are designed around small reps that compound — six days a week, every week, until the board exam.'
    ),
    (
      '77777777-7777-4777-8777-777777777773'::uuid,
      'mission_label',
      'mission_body',
      2,
      'Mission',
      'To give every Filipino mechanical engineering board candidate the structured practice, reliable explanations, and topnotcher mentorship they need to walk into the exam confident.'
    ),
    (
      '77777777-7777-4777-8777-777777777774'::uuid,
      'vision_label',
      'vision_body',
      3,
      'Vision',
      'A generation of Filipino mechanical engineers who pass the boards on their first attempt — not because they got lucky, but because they were prepared.'
    )
)
INSERT INTO public.who_we_are_sections (id, title, body, sort_order, is_active)
SELECT
  section_values.id,
  COALESCE(NULLIF(title_rows.value, ''), section_values.default_title),
  COALESCE(NULLIF(body_rows.value, ''), section_values.default_body),
  section_values.sort_order,
  true
FROM section_values
LEFT JOIN public.site_content AS title_rows
  ON title_rows.section = 'who_we_are_page'
  AND title_rows.key = section_values.title_key
LEFT JOIN public.site_content AS body_rows
  ON body_rows.section = 'who_we_are_page'
  AND body_rows.key = section_values.body_key
WHERE NOT EXISTS (
  SELECT 1
  FROM public.who_we_are_sections
)
ON CONFLICT (id) DO NOTHING;
