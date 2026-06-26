-- Canonicalize book cover references as R2 keys.
-- The browser/API layer renders these as /covers/<key>, so stored full
-- Cloudflare Pages URLs should not leak back into image requests.

WITH normalized AS (
  SELECT
    id,
    CASE
      WHEN cover_url IS NULL THEN NULL
      WHEN lower(btrim(cover_url)) IN ('', 'null', 'undefined') THEN NULL
      WHEN btrim(cover_url) ~ '(^|/)covers/[^?#]+'
        THEN regexp_replace(
          btrim(cover_url),
          '^.*?(covers/[^?#]+).*$',
          '\1'
        )
      ELSE cover_url
    END AS cover_url
  FROM public.books
)
UPDATE public.books AS books
   SET cover_url = normalized.cover_url
  FROM normalized
 WHERE books.id = normalized.id
   AND books.cover_url IS DISTINCT FROM normalized.cover_url;
