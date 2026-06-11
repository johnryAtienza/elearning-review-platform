# Views

Four views. Two are **security boundaries** (premium redaction + anon access);
two are admin/CMS conveniences.

## `lesson_previews` — the premium-redaction boundary
**Most security-sensitive view in the schema.** Projects `lessons` **without**
the premium columns (`video_url`, `reviewer_pdf_url`). The course/lesson browse
UI reads this; premium media is delivered only via `get-signed-urls`.

Final definition (after the rename migration):
```sql
CREATE VIEW public.lesson_previews
WITH (security_invoker = false)            -- runs as owner; the SELECT list is the redaction
AS SELECT id, subject_id, title, description, "order",
          week_number, day_number, is_free_preview,
          duration, duration_minutes, created_at
   FROM public.lessons;
GRANT SELECT ON public.lesson_previews TO anon, authenticated;
```

Evolution worth knowing:
- Started gated on `auth.uid() IS NOT NULL` (authenticated only).
- `fix_security_advisor.sql` flipped it to `security_invoker = true` to silence
  the advisor.
- `20260518000001` flipped back to `security_invoker = false` and `GRANT … TO
  anon` so **guests can browse curricula**. The trade-off (re-triggering the
  "Security Definer View" advisor warning) is accepted because the SELECT list
  itself excludes premium fields. Underlying `lessons` keeps RLS, so a direct
  `from('lessons')` by anon still returns nothing.

## `admin_user_list` — admin user roster
Joins `profiles` + `subscriptions`; `WHERE public.is_admin()` so non-admins get
an empty set. `security_invoker = true` (runs with caller's JWT). Final columns:
`id, name, email, first_name, last_name, mobile_number, school, school_id, role,
created_at, is_subscribed, subscription_expires_at`. Used by `AdminUsersPage`.

## `announcements_public` — homepage announcements
Anon-readable projection of `announcements` filtered to `enabled = true AND
published_at <= now()` (so future-dated posts stay hidden). Columns: `id, title,
body, published_at, cta_label, cta_href, icon, category, display_order`.
`GRANT SELECT … TO anon, authenticated`.

## `welcome_videos_public` — homepage welcome video
Anon-readable projection of `welcome_videos` filtered to `enabled = true`.
Columns: `id, title, description, video_url, thumbnail_url, cta_label, cta_href,
display_order`. The homepage renders only the top (lowest `display_order`) row.

## Pattern
The CMS and preview views all follow the same idea: **a public view exposes a
safe projection of an RLS-protected base table**, and `GRANT SELECT` to `anon`
opens it to logged-out visitors. Admin writes happen on the base table (admin
RLS). This keeps the redaction logic in one place (the view's SELECT list).
