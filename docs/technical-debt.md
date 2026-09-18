# Technical debt and operational risks

This page records unresolved issues. It is not a client manual and does not
describe pending work as released functionality.

## High priority

- The effective production schema is not fully reproducible from the migration
  directory alone.
- Migration version `20260917000001` has a known remote-ledger collision.
- Shared Supabase and R2 resources may be used by preview environments.

## Medium priority

- No repository CI workflow or automated test command.
- No repository-configured monitoring or error tracker.
- Shared root `src/` couples the app shells during the monorepo transition.
- Pages Function public-asset proxy code is duplicated.
- Edge Functions use permissive CORS and rely on in-function authorization.

## Lower priority or unresolved implementation debt

- Reviewer content has a fallback/stub where the production source is incomplete.
- Quiz score calculation has a client-side component.
- Firebase and REST provider branches remain abstraction seams.
- `lesson_progress.lesson_id` lacks equivalent referential integrity.

## Pending feature dependency

Lesson Preview Image and Curriculum hover preview are committed but their
migration application and production deployment are not verified. They require
those release checks before being documented as current functionality.

See [Known gaps](known-gaps.md) for the maintained summary and
[Migration operations](database/migrations.md) for the collision procedure.
