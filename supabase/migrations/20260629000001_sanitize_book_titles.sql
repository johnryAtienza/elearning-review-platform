-- Remove social/share scraper chrome that was accidentally imported into book
-- titles. Display code also normalizes this, but cleaning persisted catalog
-- data keeps admin exports, orders, and future clients consistent.

UPDATE public.books
   SET title = btrim(regexp_replace(title, '^Share:\s*Favorite\s*\([0-9]+\)\s*', '', 'i'))
 WHERE title ~* '^Share:\s*Favorite\s*\([0-9]+\)\s*';
