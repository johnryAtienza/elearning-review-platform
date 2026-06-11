# Constraints

## Primary keys
Every `public` table uses a `uuid` PK defaulting to `gen_random_uuid()`, except
`profiles.id` which is the `auth.users(id)` FK doubling as PK (1:1).

## Unique constraints
| Table | Unique | Why |
|---|---|---|
| `courses` | `name`, `slug` | one course per name/slug |
| `lessons` | `(subject_id, "order")` | no duplicate ordering in a subject |
| `subscriptions` | `(user_id)` | one subscription row per user (enables upsert) |
| `saved_subjects` | `(user_id, subject_id)` | bookmark once |
| `lesson_progress` | `(user_id, lesson_id)` | one progress row per user+lesson |
| `payments` | `(paymongo_id)` | **idempotency** for verify/webhook |
| `book_orders` | `(paymongo_session_id)` | idempotency for book payments |
| `user_devices` | `(user_id, fingerprint)` | one row per device; plus **partial unique** `(user_id, device_kind) WHERE is_active` (the cap) |

> `quiz_results` originally had `UNIQUE(user_id, lesson_id)`; **dropped** in
> `20260520000002` so every attempt is its own row (full history).

## Check constraints
| Table.column | Check |
|---|---|
| `profiles.role` | `IN ('user','admin')` |
| `subscriptions.tier` | `IN ('free','standard')` |
| `subscriptions.duration_months` | `IN (1,3,6)` |
| `subjects.difficulty` | `IN ('Beginner','Intermediate','Advanced')` |
| `payments.duration_months` | `IN (1,3,6)` |
| `payments.status` | `IN ('pending','paid','failed')` |
| `books.price_centavos` | `>= 0` |
| `books.stock` | `>= 0` |
| `books.status` | `IN ('draft','published','archived')` |
| `book_orders.qty` | `>= 1` |
| `book_orders.unit_price_centavos`, `total_centavos` | `>= 0` |
| `book_orders.status` | `IN ('pending','paid','shipped','delivered','cancelled')` |
| `user_devices.device_kind` | `IN ('mobile','desktop')` |
| `announcements` CTA | `CHECK ((cta_label IS NULL) = (cta_href IS NULL))` — both-or-neither |
| `welcome_videos` CTA | same both-or-neither CTA pairing |

## NOT NULL / defaults of note
- `subscriptions.is_active` default `true`, `tier` default `'standard'`,
  `duration_months` default `1`.
- `books.status` default `'draft'` (new books are hidden).
- `subjects.is_published` default `false` (new subjects are drafts).
- `lessons.is_free_preview` default `false` (new lessons are premium).
- `book_orders.status` default `'pending'`.

## Referential actions
- Mostly `ON DELETE CASCADE` from `auth.users` (deleting a user wipes their data).
- `subjects.course_id` → `ON DELETE SET NULL` (deleting a parent course unassigns
  subjects rather than deleting them).
- `book_orders.book_id` → `ON DELETE RESTRICT` (cannot delete a book with orders).

## Integrity gaps
- `lesson_progress.lesson_id` is plain `text` (no FK) — orphan rows possible.
- `quiz_questions` FK/constraints are inferred (out-of-band table) and not
  guaranteed to match the documented shape. See [tables.md](tables.md).
