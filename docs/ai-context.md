# AI context

S-Class is an npm-workspaces React/TypeScript monorepo. `apps/landing` serves
the production marketing website and `/portal/*` student experience;
`apps/portal` is the student source/local workspace; `apps/admin` is a separate
production Admin Panel. The app shells share root `src/*` and `@s-class/*`
packages.

Backend is Supabase Auth/PostgreSQL/RLS plus the current Edge Functions. Media
is stored in Cloudflare R2 and premium assets use short-lived signed URLs.
Public assets use Pages Functions. Payments use PayMongo checkout, verification,
and webhooks. The `subscribe` Edge Function is disabled and returns HTTP 410.

Important facts:

1. Course is the parent grouping and Subject is the student-facing study unit.
   Legacy URL strings remain for compatibility.
2. The root `src/` tree is shared source, not a runnable root application.
3. Production student access is Landing `/portal/*`; Portal is not an
   independent production deployment.
4. RLS, Edge Function authorization, and signed URLs are the access boundary.
5. `quiz_questions`, the current parent-shaped `quizzes` model,
   `quizzes.randomize_questions`, and `subjects.thumbnail_url` are known
   out-of-band schema history.
6. Migration version `20260917000001` has an unresolved remote-ledger
   collision. Inspect local and remote history before any push.
7. Lesson Preview Image and Curriculum hover preview work is pending and must
   not be represented as released functionality.

For focused context, use [docs/README.md](README.md),
[current architecture](architecture/current.md), [access control](access-control.md),
[effective schema](database/effective-schema.md), and
[known gaps](known-gaps.md).
