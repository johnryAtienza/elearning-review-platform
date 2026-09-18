# Known gaps and unresolved operational issues

## Database and migrations

- Migration history does not fully reproduce the historical production schema.
- Several effective objects or shape changes were created out of band.
- Migration version `20260917000001` has a known remote-ledger collision that is
  not yet documented as resolved.
- The current Lesson Preview Image/hover-preview work is committed in the
  branch, but its migration application and production release are not verified;
  it is not released documentation-wise.

## Engineering operations

- No repository CI workflow was found.
- No automated test command is defined in the root package scripts.
- No repository-configured monitoring or error-tracking service was found.
- Preview/staging environments may use shared production Supabase and R2
  resources.
- Public asset proxy code is duplicated across root and app Pages Function
  locations.
- Shared root `src/` keeps app changes tightly coupled during the monorepo
  transition.

## Known implementation debt

- Reviewer content has a service fallback/stub where the production content
  source is incomplete.
- Quiz score calculation still has a client-side component.
- Firebase and REST provider branches remain as abstraction seams without a
  corresponding fully deployed backend path.
- `lesson_progress.lesson_id` lacks the same referential integrity as the
  lesson identity model.

These are documentation findings, not changes made by this refresh.
