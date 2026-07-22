-- ============================================================
--  MIGRATION: add_who_we_are_page_content
--
--  Makes the public Who We Are page text editable.
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
  );

INSERT INTO public.site_content (section, key, value)
VALUES
  ('who_we_are_page', 'eyebrow', 'Who We Are'),
  ('who_we_are_page', 'title', 'A focused board exam review program'),
  ('who_we_are_page', 'who_are_we_label', 'Who Are We'),
  ('who_we_are_page', 'who_are_we_body', 'S Class Review is a focused board exam review program for Filipino mechanical engineering candidates. We pair printed reviewer books with an always-on online platform — daily problem solutions, weekly drills, and topnotcher-led catch-up sessions — so reviewers can keep momentum whether they study at home, on a commute, or between work shifts.'),
  ('who_we_are_page', 'review_philosophy_label', 'Review Philosophy'),
  ('who_we_are_page', 'review_philosophy_body', 'Pass rates rise when reviewers practise consistently, not heroically. Our daily MC drills, weekly mock exams, and worked solutions are designed around small reps that compound — six days a week, every week, until the board exam.'),
  ('who_we_are_page', 'mission_label', 'Mission'),
  ('who_we_are_page', 'mission_body', 'To give every Filipino mechanical engineering board candidate the structured practice, reliable explanations, and topnotcher mentorship they need to walk into the exam confident.'),
  ('who_we_are_page', 'vision_label', 'Vision'),
  ('who_we_are_page', 'vision_body', 'A generation of Filipino mechanical engineers who pass the boards on their first attempt — not because they got lucky, but because they were prepared.')
ON CONFLICT (section, key) DO NOTHING;
