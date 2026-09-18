# Effective database schema

This document describes the application-facing schema as verified from current
source, migrations, views, RPCs, and known production history. It is not a claim
that `supabase/schema.sql` plus the migration directory can recreate every
historical production object.

## Main domains

- **Identity:** Supabase Auth users, `profiles`, roles, and profile metadata.
- **Learning:** parent courses, student-facing subjects, lessons, curriculum
  Week/Day fields, publication, duration, media metadata, and lesson progress.
- **Assessment:** quizzes, quiz questions, scoring metadata, quiz attempts, and
  answer review.
- **Entitlement:** subscriptions, payments, subscription audit events, and
  access helper functions.
- **Commerce:** books, stock, book orders, and book-payment state.
- **Operations/CMS:** devices, announcements, welcome videos, site content,
  contact content, testimonials, FAQ, Who We Are, and review packages.

## Effective access model

RLS protects user-owned records and published/free-preview reads. Privileged
subscription, user, device, order, and storage operations use authorized Edge
Functions with service-role access and explicit in-function checks.

The `lesson_previews` view intentionally exposes redacted lesson metadata for
public curriculum rendering. Premium media columns are delivered separately by
the signed-URL function.

## Historical schema gaps

The following known production objects or shape changes are not fully captured
by the migration history:

- `quiz_questions` table creation.
- The current parent-shaped `quizzes` model.
- `quizzes.randomize_questions`.
- `subjects.thumbnail_url`.
- Some related historical RLS and service assumptions.

Therefore, a fresh database built only from the repository migrations is not a
reliable production clone. Do not attempt to fix that gap as part of ordinary
feature documentation work. A canonical production schema dump and a planned
baseline migration are separate operational work.

## Source references

- Baseline schema: `supabase/schema.sql`
- Current migrations: `supabase/migrations/`
- Database detail references: `docs/database/tables.md`, `views.md`, `rpcs.md`,
  and `rls-policies.md`
- Querying services: `packages/api/src/*.service.ts`
