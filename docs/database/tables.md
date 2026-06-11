# Database Tables

Effective schema after all migrations. Premium columns and out-of-band objects
are flagged. "Used in" cites the main service/query path.

---

## `profiles`
Public mirror of `auth.users`. One row auto-created on signup by the
`handle_new_user` trigger — **never insert manually**.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `name` | text | display name; falls back to email prefix |
| `avatar_url` | text | optional |
| `role` | text | `'user'` \| `'admin'`; **synced from `app_metadata`**, not client-writable |
| `email` | text | |
| `first_name`, `last_name`, `mobile_number` | text | from registration metadata |
| `school`, `school_id` | text | free-text; captured at registration / editable on `/profile` |
| `created_at`, `updated_at` | timestamptz | `updated_at` auto-stamped |

**Relationships:** 1:1 with `auth.users`. **Used in:** `profileService.ts`,
`admin_user_list` view, `AdminUsersPage`.

---

## `courses` *(was `categories`)*
The **parent grouping** (e.g. "Mechanical Engineering Review"). Contains many subjects.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | UNIQUE |
| `slug` | text | UNIQUE; auto-generated from name |
| `description` | text | nullable |
| `created_at`, `updated_at` | timestamptz | |

**Relationships:** 1‑to‑many → `subjects.course_id`. **Used in:** `coursesApi.ts`,
`AdminCoursesPage` (URL `/admin/categories`).

---

## `subjects` *(was `courses`)*
The thing students browse and study (e.g. "Engineering Mathematics"). Only
`is_published = true` rows are visible to non-admins.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid FK | → `courses(id)` ON DELETE SET NULL (was `category_id`) |
| `title` | text | |
| `description` | text | |
| `thumbnail` | text | Tailwind gradient string **or** image URL |
| `thumbnail_url` | text | ⚠️ **out-of-band column** (no migration); full CDN URL of cover |
| `category` | text | **legacy** denormalized parent name; retained until cleanup (plan §8a) |
| `duration` | text | display string |
| `is_published` | boolean | default false |
| `difficulty` | text | Beginner/Intermediate/Advanced (nullable) |
| `tags` | text[] | search tags |
| `search_vector` | tsvector | weighted title(A)+description(B)+tags(C); auto-maintained |
| `created_at`, `updated_at` | timestamptz | |

**Relationships:** child of `courses`; parent of `lessons` + `saved_subjects`.
**Used in:** `subject.service.ts`, `subjectApi.ts`, `SubjectsPage`,
`AdminSubjectsPage` (URL `/admin/courses`).

---

## `lessons`
Belongs to a subject. `order` sequences lessons. `video_url` and
`reviewer_pdf_url` are **premium R2 keys** — never exposed to the client directly
(only via `get-signed-urls`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `subject_id` | uuid FK | → `subjects(id)` ON DELETE CASCADE (was `course_id`) |
| `title`, `description` | text | |
| `video_url` | text | 🔒 premium R2 key |
| `reviewer_pdf_url` | text | 🔒 premium R2 key |
| `order` | int | UNIQUE per `(subject_id, order)` |
| `duration` | text | display ("28m") |
| `duration_minutes` | int | numeric, for progress calc |
| `week_number` | int | curriculum week (backfill `ceil(order/6)`) |
| `day_number` | int | curriculum day; **legacy** free-access trigger |
| `is_free_preview` | boolean | **authoritative free-access flag** (replaces day_number=1) |
| `created_at`, `updated_at` | timestamptz | |

**Used in:** `lesson.service.ts`, `lessonApi.ts`, `get-signed-urls`, `LessonPage`.
The premium-safe projection is the `lesson_previews` view.

---

## `quizzes` *(restructured out-of-band)*
**In `schema.sql`** this was *one row per question*. **In production** it is a
**parent** row per lesson; the questions live in `quiz_questions`. The restructure
has no migration — only `add_quiz_description.sql` (adds `description`) is committed.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `lesson_id` | uuid FK | → `lessons(id)` ON DELETE CASCADE |
| `description` | text | optional (migration `add_quiz_description`) |
| `randomize_questions` | boolean | ⚠️ referenced by `admin.service.ts` — **out-of-band column** |

**Used in:** `quiz.service.ts` (`from('quizzes')`), `admin.service.ts`.

---

## `quiz_questions` *(⚠️ entirely out-of-band — no `CREATE TABLE` migration)*
Individual MCQ questions for a quiz. Referenced by RLS policies
(`fix_security_advisor.sql`, Day-1/free-preview migrations) and services, but the
table's DDL was applied via the dashboard. Reconstructed from usage:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `quiz_id` | uuid FK | → `quizzes(id)` |
| `question` | text | stem (may be empty if image-only) |
| `question_image_url` | text | optional |
| `options` / `choices` | jsonb | answer choices (text + optional imageUrl) |
| `correct_answer` | int | 0-based index |
| `answer_text` | text | explanation (migration `add_quiz_answer_fields`) |
| `answer_image_url` | text | explanation image |

**Used in:** `quiz.service.ts` (`from('quiz_questions')`), `admin.service.ts`
(create/update/count), `QuizModal`.

---

## `subscriptions`
One row per user. `expires_at = NULL` means non-expiring.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK, **UNIQUE** | → `auth.users` |
| `plan_id` | text | default `'pro'` |
| `tier` | text | `'free'` \| `'standard'` (default standard) |
| `duration_months` | int | 1\|3\|6 |
| `is_active` | boolean | default true |
| `started_at` | timestamptz | preserved across extensions |
| `expires_at` | timestamptz | **authoritative** for access; null = lifetime |
| `created_at` | timestamptz | |

**Writes:** only via Edge Functions/`extend_subscription` (service role). RLS lets
users *read own* and (legacy) insert/update own — see [rls-policies.md](rls-policies.md).

---

## `quiz_results`
One row **per attempt** (the original `UNIQUE(user_id, lesson_id)` was dropped in
`20260520000002` to keep full history).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `lesson_id` | uuid FK | → `lessons` |
| `score`, `total` | int | computed client-side |
| `answers` | jsonb | `{ questionId: choiceIndex }` |
| `submitted_at` | timestamptz | |

**Insert:** subscribers OR free-preview lessons. **Read:** own only.

---

## `saved_subjects` *(was `saved_courses`)*
Per-user bookmarks.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `subject_id` | uuid FK | → `subjects` (was `course_id`) |
| `added_at` | timestamptz | |
| | | UNIQUE `(user_id, subject_id)` |

---

## `lesson_progress`
Per-user watched state. Note `lesson_id` is **`text`**, not a uuid FK (joins cast
`l.id::text = lp.lesson_id`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `lesson_id` | text | not an FK |
| `is_watched` | boolean | |
| `watched_at` | timestamptz | |
| `created_at`, `updated_at` | timestamptz | UNIQUE `(user_id, lesson_id)` |

---

## `payments`
PayMongo subscription payment ledger — idempotency + audit.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `paymongo_id` | text **UNIQUE** | checkout session id (idempotency key) |
| `amount` | int | centavos |
| `currency` | text | default PHP |
| `duration_months` | int | 1\|3\|6 |
| `status` | text | pending\|paid\|failed |
| `created_at`, `paid_at` | timestamptz | |

**Writes:** Edge Functions only (no client write policy — by design).

---

## `books`
Hardcopy book catalog.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title`, `author`, `isbn`, `description` | text | |
| `cover_url` | text | R2 key |
| `price_centavos` | int | ≥ 0 |
| `stock` | int | ≥ 0; decremented atomically at checkout |
| `status` | text | draft\|published\|archived (replaced `is_published`) |
| `created_at`, `updated_at` | timestamptz | |

---

## `book_orders`
One order per row (single book per order in v1).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `book_id` | uuid FK | → `books` ON DELETE RESTRICT |
| `qty` | int | ≥ 1 |
| `unit_price_centavos`, `total_centavos` | int | price snapshot at order time |
| `shipping_address` | jsonb | `{ fullName, phone, line1, line2?, city, province, region, postalCode, notes? }` |
| `status` | text | pending\|paid\|shipped\|delivered\|cancelled |
| `paymongo_session_id` | text UNIQUE | nullable until session created |
| `tracking_no` | text | admin-entered |
| `ordered_at`/`paid_at`/`shipped_at`/`delivered_at`/`cancelled_at` | timestamptz | lifecycle stamps |

**Writes:** INSERT via Edge Function (service role) only; admin UPDATE for fulfillment.

---

## `user_devices`
Device-limit tracking (1 mobile + 1 desktop).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `fingerprint` | text | FingerprintJS visitorId; UNIQUE `(user_id, fingerprint)` |
| `device_kind` | text | mobile\|desktop |
| `user_agent`, `ip`, `label` | text | audit/label |
| `is_active` | boolean | partial UNIQUE `(user_id, device_kind) WHERE is_active` |
| `first_seen_at`, `last_seen_at`, `created_at`, `updated_at` | timestamptz | |

**Writes:** `register-device` / `revoke-device` Edge Functions only.

---

## `announcements` (Homepage CMS)
Admin-managed timeline cards on the homepage.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title`, `body` | text | |
| `published_at` | timestamptz | supports future scheduling |
| `enabled` | boolean | |
| `cta_label`, `cta_href` | text | both-or-neither (CHECK) |
| `icon` | text | lucide icon name |
| `category` | text | free-form tag |
| `display_order` | int | |
| `created_at`, `updated_at` | timestamptz | |

Public reads go through `announcements_public` view.

---

## `welcome_videos` (Homepage CMS)
Admin-managed intro video card (only top enabled row renders).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title`, `description` | text | |
| `video_url` | text | YouTube/Vimeo/R2; null → static thumbnail card |
| `thumbnail_url` | text | public CDN URL |
| `cta_label`, `cta_href` | text | both-or-neither (CHECK) |
| `enabled` | boolean | |
| `display_order` | int | |
| `created_at`, `updated_at` | timestamptz | |

Public reads go through `welcome_videos_public` view.

---

## Schema drift (must-know)

| Object | Status | Risk |
|---|---|---|
| `quiz_questions` table | No `CREATE TABLE` migration | A fresh DB built from migrations is missing the table; quizzes break. |
| `quizzes` restructure (parent shape) | No migration | `schema.sql` shows the old one-row-per-question shape; live shape differs. |
| `quizzes.randomize_questions` | No migration | Referenced by `admin.service.ts`. |
| `subjects.thumbnail_url` | No `ADD COLUMN` migration | Referenced by `subject.service.ts` + thumbnail-rewrite migrations. |

**Recommendation:** capture a `pg_dump --schema-only` of production into a single
canonical baseline so the repo can rebuild the DB deterministically. Tracked in
[../technical-debt.md](../technical-debt.md).
