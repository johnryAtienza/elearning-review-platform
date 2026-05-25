-- Stopgap: point legacy course thumbnails at the landing apex
-- (https://s-class.com.ph), which serves /thumbnails/<key> via the
-- Cloudflare Pages Function at apps/landing/functions/thumbnails/[[path]].ts.
--
-- The previous migration (20260518000002_proxy_public_assets_through_pages.sql)
-- rewrote thumbnails to https://elearning-review-platform.pages.dev, which
-- disappears as part of the subdomain split. A follow-up migration will
-- repoint these to cdn.s-class.com.ph once the dedicated CDN domain is
-- provisioned.
UPDATE courses
   SET thumbnail_url = replace(
        thumbnail_url,
        'https://elearning-review-platform.pages.dev',
        'https://s-class.com.ph'
      )
 WHERE thumbnail_url LIKE 'https://elearning-review-platform.pages.dev/%';

-- NOTE: Before applying, run the sibling-column check from
-- ~/.claude/plans/ganito-ba-ung-goal-tingly-marble.md (Action 1, step 1):
--   SELECT table_name, column_name FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND (column_name ILIKE '%url%' OR column_name ILIKE '%avatar%' OR column_name ILIKE '%cover%');
-- For any *_url column found that holds the dead host, mirror the UPDATE
-- above. The original migration confirmed courses.thumbnail_url was the
-- only one storing a full URL; revalidate in case schema has drifted.
