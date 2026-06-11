# ADR 0007 — Rename to Course→Subject hierarchy, keep legacy URLs

**Status:** Accepted · **Evidence:**
`supabase/migrations/20260606000001_rename_to_course_subject_hierarchy.sql`,
`@s-class/types/{courses,subjects}.ts`, `@s-class/constants/routes.ts` (comments),
`apps/admin/src/app/router.tsx` (mapping comments).

## Context
The original schema had `courses` (the studyable unit) and `categories` (groupings).
The team's intended academic model is **Course → Subject → Lesson + Quiz**, where a
*Course* is the parent grouping (e.g. "Mechanical Engineering Review") and a
*Subject* is what a student studies (e.g. "Engineering Mathematics"). The old names
were backwards relative to that model.

## Decision
Rename the schema to the intended vocabulary in **one migration**, but **keep the
URL strings legacy** to bound the blast radius:
- `courses → subjects`, `categories → courses`, `saved_courses → saved_subjects`;
  FK columns `category_id → course_id`, `course_id → subject_id`.
- Recreate the affected view (`lesson_previews`) and 3 RPCs with new return shapes;
  rename 11 indexes, 3 triggers, 1 function, 12 policies.
- **URL paths stay** (`/courses` lists Subjects, `/admin/categories` manages
  Courses); constant *names* in `ROUTES` use the new vocabulary. A URL migration is
  a separate, deferred sprint. The legacy `subjects.category` text column is also
  retained until a cleanup migration.

## Alternatives considered (inferred)
- **Rename tables AND URLs together** — rejected: larger blast radius (redirects,
  bookmarks, SEO, cross-app links) for no immediate user value.
- **Leave the schema misnamed** — rejected: the model was confusing for everyone
  building features.

## Consequences
- ✅ DB + types now match the mental model (Course parent, Subject child).
- ✅ Bounded change: no user-facing URL churn, no redirect/SEO work yet.
- ⚠️ **Permanent foot-gun until the URL sprint:** `/courses`=Subjects,
  `/course/:id`=Subject, `/admin/courses`=Subjects, `/admin/categories`=Courses.
  Every new dev must learn this. Documented in
  [../business-domains/courses-subjects.md](../business-domains/courses-subjects.md)
  and [../ai-context.md](../ai-context.md).
- ⚠️ Migration replay ordering caveat (legacy `add_*` files sort after this one) —
  flagged in the migration header; harmless for incremental prod pushes.
- ⚠️ Leftover legacy `subjects.category` text column duplicates the `course_id` FK.
