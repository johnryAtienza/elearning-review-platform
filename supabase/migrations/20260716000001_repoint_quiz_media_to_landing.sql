-- Repoint legacy quiz media URLs from the old Pages project to the landing apex.
-- The landing app serves /quizzes/<key> through its Pages Function, so these
-- public assets should not depend on the retired elearning-review-platform host.

UPDATE public.quiz_questions
   SET question_image_url = replace(
        question_image_url,
        'https://elearning-review-platform.pages.dev',
        'https://s-class.com.ph'
      ),
       answer_image_url = replace(
        answer_image_url,
        'https://elearning-review-platform.pages.dev',
        'https://s-class.com.ph'
      ),
       options = replace(
        options::text,
        'https://elearning-review-platform.pages.dev',
        'https://s-class.com.ph'
      )::jsonb
 WHERE question_image_url LIKE 'https://elearning-review-platform.pages.dev/%'
    OR answer_image_url LIKE 'https://elearning-review-platform.pages.dev/%'
    OR options::text LIKE '%https://elearning-review-platform.pages.dev/%';
