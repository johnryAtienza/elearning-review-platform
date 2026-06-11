# Triggers

## Trigger functions

### `handle_new_user()` — SECURITY DEFINER
Fires `AFTER INSERT ON auth.users`. Creates the `profiles` row from signup
metadata. Evolved across migrations; the **final** version
(`20260513000004_add_profile_school`) inserts `id, name, email, first_name,
last_name, mobile_number, school, school_id, role`:
- `name` ← `raw_user_meta_data.name`, else `first + ' ' + last`, else email prefix.
- `role` ← `raw_app_meta_data.role` (server-set), else `'user'`.
- `ON CONFLICT (id) DO UPDATE` refreshes email/name/school fields (idempotent).

> This is why **you never insert into `profiles` directly** — the trigger owns it.
> Admin role must be granted in `app_metadata` (see `supabase/seed/create_admin.sql`).

### `set_updated_at()`
Sets `NEW.updated_at = now()` before update. Re-declared in several migrations.

### `update_subject_search_vector()` *(was `update_course_search_vector`)*
Recomputes the weighted `search_vector` (title A, description B, tags C) on
insert/update of `subjects`. Renamed in the hierarchy migration (triggers
reference functions by OID, so the rename is transparent).

## Trigger catalog

| Trigger | Table | When | Function |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` |
| `trg_profiles_updated_at` | `profiles` | BEFORE UPDATE | `set_updated_at()` |
| `trg_subjects_updated_at` *(was `trg_courses_updated_at`)* | `subjects` | BEFORE UPDATE | `set_updated_at()` |
| `trg_lessons_updated_at` | `lessons` | BEFORE UPDATE | `set_updated_at()` |
| `courses_updated_at` *(was `categories_updated_at`)* | `courses` | BEFORE UPDATE | `set_updated_at()` |
| `subjects_search_vector_update` *(was `courses_search_vector_update`)* | `subjects` | BEFORE INSERT/UPDATE | `update_subject_search_vector()` |
| `lesson_progress_updated_at` | `lesson_progress` | BEFORE UPDATE | `set_updated_at()` |
| `categories_updated_at` (pre-rename) | (renamed to `courses_updated_at`) | — | — |
| `trg_books_updated_at` | `books` | BEFORE UPDATE | `set_updated_at()` |
| `trg_book_orders_updated_at` | `book_orders` | BEFORE UPDATE | `set_updated_at()` |
| `trg_user_devices_updated_at` | `user_devices` | BEFORE UPDATE | `set_updated_at()` |
| `trg_announcements_updated_at` | `announcements` | BEFORE UPDATE | `set_updated_at()` |
| `trg_welcome_videos_updated_at` | `welcome_videos` | BEFORE UPDATE | `set_updated_at()` |

## Behavioral notes
- The only **business-logic** trigger is `handle_new_user`; everything else is
  bookkeeping (`updated_at`) or denormalization (`search_vector`).
- `search_vector` is auto-maintained, so application code never sets it.
- `subjects.thumbnail_url`/`quiz_questions` (out-of-band) have **no documented
  triggers**; if `updated_at` behavior is expected there, verify in the dashboard.
