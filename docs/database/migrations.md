# Migration operations

## Rules

- Every migration filename must use a unique timestamp/version.
- A version already recorded in the remote Supabase migration ledger must never
  be reused for different SQL.
- Do not casually edit, rename, or rewrite a migration that has already been
  applied to production.
- Maintenance or destructive scripts must not be mixed into the replayable
  migration history without an explicit operational decision.

The current migration set is in `supabase/migrations`. Prefer that directory as
the live inventory instead of hardcoding a migration count in documentation.

## Before `supabase db push`

1. Review `git status --short` and confirm which migration files are new,
   renamed, or deleted.
2. Inspect the local migration filenames for duplicate versions.
3. Inspect the remote Supabase migration history for the same versions.
4. Compare the SQL and names of any local file whose version already exists
   remotely.
5. Stop and reconcile the ledger if local and remote histories disagree.
6. Only then run a reviewed migration push against the intended project.

The remote project and target environment must be confirmed before any write.

## Known unresolved collision

The migration history currently has a known collision involving version
`20260917000001`. The reported Supabase CLI failure was a duplicate primary-key
error in `schema_migrations` because that version was already present remotely.
The local worktree includes a renamed welcome-thumbnail migration and a pending
lesson preview-image migration, but this does not prove that the remote ledger
has been reconciled.

This is an unresolved operational issue, not a completed migration fix. Do not
blindly rerun `supabase db push`, delete remote history, or rewrite an applied
production migration to make the error disappear.

## Reproducibility limitation

The effective production schema also contains known out-of-band objects. A
successful migration push would not, by itself, make a fresh database fully
reproducible. See [Effective schema](effective-schema.md) and
[Known gaps](../known-gaps.md).
