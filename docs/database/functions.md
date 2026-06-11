# Database Functions

All `public` functions. Most are `SECURITY DEFINER` so they can run privileged
logic inside RLS policies or on behalf of Edge Functions. Client-callable ones
are also catalogued in [rpcs.md](rpcs.md).

## Authorization helpers (used inside RLS)

| Function | Returns | Purpose |
|---|---|---|
| `is_admin(uid uuid DEFAULT auth.uid())` | boolean | `raw_app_meta_data->>'role' = 'admin'`. The admin gate in every admin RLS policy. SECURITY DEFINER (reads `auth.users`). |
| `is_active_subscriber(uid uuid DEFAULT auth.uid())` | boolean | active, non-expired subscription exists. Used by premium RLS. |
| `current_user_is_subscribed()` | boolean | convenience wrapper over `is_active_subscriber(auth.uid())`. |
| `get_user_tier(uid uuid DEFAULT auth.uid())` | text | `'standard'` if active sub else `'free'`. |
| `subscription_days_remaining(uid)` | int | whole days to expiry; null if none. |

## Subscription logic

### `extend_subscription(p_user_id uuid, p_duration_months int, p_tier text='standard')`
Returns `(new_expires_at, previous_expires_at, days_added)`. The carryover-aware
upsert at the heart of billing:

| Scenario | New `expires_at` |
|---|---|
| No prior / lapsed subscription | `now() + N months` |
| Active (future expiry) | `existing_expires_at + N months` (stacks) |

Validates `N ∈ {1,3,6}`; preserves `started_at` on extension. SECURITY DEFINER,
**not exposed via PostgREST** — only the Edge Functions (`verify-payment`,
`subscribe`) invoke it with the service role. See
[../business-domains/memberships.md](../business-domains/memberships.md).

## Books logic

| Function | Returns | Purpose |
|---|---|---|
| `decrement_book_stock(p_book_id uuid, p_qty int)` | boolean | Row-locking (`FOR UPDATE`) atomic stock decrement; false if missing/insufficient. Called inside `create-book-checkout`. |
| `restock_book(p_book_id uuid, p_qty int)` | void | Restore stock on order cancel (admin). |

## Dashboard / history RPCs (client-callable)

| Function | Returns | Purpose |
|---|---|---|
| `get_saved_subjects_progress()` | TABLE(subject_id, watched_lessons, total_lessons, added_at) | per-saved-subject progress for `auth.uid()`. (was `get_saved_courses_progress`) |
| `get_dashboard_stats()` | json `{ subjects_saved, lessons_completed, quizzes_taken }` | dashboard cards. (key was `courses_saved`) |
| `get_quiz_history(p_limit int=50)` | TABLE(id, lesson_id, lesson_title, subject_id, subject_title, score, total, submitted_at) | newest-first attempts joined to lesson+subject. |

These are `STABLE SECURITY DEFINER` and scope to `auth.uid()` internally, and are
`GRANT EXECUTE … TO authenticated`.

## Trigger functions
See [triggers.md](triggers.md): `handle_new_user()`, `set_updated_at()`,
`update_subject_search_vector()`.

## Security-definer rationale
`SECURITY DEFINER` lets these run with the **owner's** rights so they can:
- read `auth.users` (e.g. `is_admin`) which the caller can't,
- bypass the RLS recursion that would occur if a policy queried its own table,
- perform privileged writes (`extend_subscription`, `decrement_book_stock`).

Each pins `SET search_path = public` to prevent search-path hijacking — the
standard Supabase hardening for definer functions.
