-- Normalize only Welcome Video CMS thumbnail values that point to a cms/ asset.
-- Storage keys and public URLs become stable root-relative paths; other values
-- (including unrelated Welcome Video fields) are untouched.

WITH normalized AS (
  SELECT
    id,
    CASE
      WHEN btrim(thumbnail_url) LIKE '/cms/%'
        THEN btrim(thumbnail_url)
      WHEN btrim(thumbnail_url) LIKE 'cms/%'
        THEN '/' || btrim(thumbnail_url)
      WHEN btrim(thumbnail_url) ~* '(^|/)cms/'
        THEN substring(btrim(thumbnail_url) FROM '(?i)(/cms/[^?#]+)')
      ELSE NULL
    END AS thumbnail_path
  FROM public.welcome_videos
  WHERE thumbnail_url IS NOT NULL
)
UPDATE public.welcome_videos AS welcome_video
SET thumbnail_url = normalized.thumbnail_path
FROM normalized
WHERE welcome_video.id = normalized.id
  AND normalized.thumbnail_path LIKE '/cms/%'
  AND normalized.thumbnail_path NOT LIKE '%..%'
  AND welcome_video.thumbnail_url IS DISTINCT FROM normalized.thumbnail_path;
