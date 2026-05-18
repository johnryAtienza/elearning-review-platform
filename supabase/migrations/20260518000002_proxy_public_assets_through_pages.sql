-- Rewrite course thumbnails from raw R2 dev URL to Pages proxy domain.
-- The Cloudflare Pages Function at /thumbnails/[[path]].ts now serves these
-- via the project's own domain, so URLs stored as the old R2 dev host need
-- to be swapped in place. Non-matching rows are untouched.
UPDATE courses
   SET thumbnail_url = replace(
        thumbnail_url,
        'https://pub-b9992a8163614492ad0ec7558fd648e9.r2.dev',
        'https://elearning-review-platform.pages.dev'
      )
 WHERE thumbnail_url LIKE 'https://pub-b9992a8163614492ad0ec7558fd648e9.r2.dev/%';

-- NOTE: If other tables also store full R2 dev URLs (avatars, book covers,
-- quiz question images), mirror the UPDATE above. Confirm first with:
--   SELECT table_name, column_name FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND (column_name ILIKE '%url%' OR column_name ILIKE '%avatar%' OR column_name ILIKE '%cover%');
-- The exploration for this change only confirmed courses.thumbnail_url
-- stores a full URL; other columns may store storage paths instead and
-- therefore need no rewrite.
