# Row-Level Security Policies

**RLS is the real authorization boundary.** Every `public` table that holds user
or premium data has RLS enabled. Policy *names* were renamed (not rewritten) in
the hierarchy migration; bodies use helper functions, not table-name strings.

Legend: 🟢 anyone · 🔵 authenticated user (own rows) · 🟣 subscriber · 🟠 admin ·
🔴 service-role only (no client policy).

## profiles
| Op | Policy | Rule |
|---|---|---|
| SELECT | read own | `auth.uid() = id` 🔵 |
| SELECT | admin reads all | `is_admin()` 🟠 |
| UPDATE | update own | `auth.uid() = id` 🔵 |
| INSERT | — | trigger-only (`handle_new_user`) 🔴 |

## courses *(was categories)*
| Op | Rule |
|---|---|
| SELECT | `true` 🟢 (public — for filter UI) |
| INSERT/UPDATE/DELETE | `is_admin()` 🟠 |

## subjects *(was courses)*
| Op | Rule |
|---|---|
| SELECT | `is_published = true` 🟢 **OR** `is_admin()` 🟠 (admins see drafts) |
| INSERT/UPDATE/DELETE | `is_admin()` 🟠 |

## lessons
| Op | Policy | Rule |
|---|---|---|
| SELECT | subscribed users read | `auth.uid() IS NOT NULL AND is_active_subscriber()` 🟣 |
| SELECT | authenticated read preview | `auth.uid() IS NOT NULL` 🔵 (supports `lesson_previews` invoker era) |
| SELECT | admin reads all | `is_admin()` 🟠 |
| INSERT/UPDATE/DELETE | admin | `is_admin()` 🟠 |

> Premium columns are not protected at the *column* level — they're protected by
> never being selected into the anon-readable `lesson_previews` view and by media
> living behind `get-signed-urls`. Direct `from('lessons')` by anon returns 0 rows.

## quizzes
| Op | Policy | Rule |
|---|---|---|
| SELECT | subscribed or free-preview | `(auth.uid() AND is_active_subscriber()) OR EXISTS(lesson where is_free_preview)` 🟣🟢 |
| SELECT | admin reads all | `is_admin()` 🟠 |
| INSERT/UPDATE/DELETE | admin | `is_admin()` 🟠 |

> Evolution: subscriber-only → "or day-1 free" → **"or free-preview"** (keys on
> `lessons.is_free_preview`; the `is_free_preview` branch grants **anon** access
> so guests can take preview quizzes).

## quiz_questions *(out-of-band table; RLS added by migrations)*
| Op | Rule |
|---|---|
| SELECT | `(auth.uid() AND is_active_subscriber()) OR EXISTS(parent quiz's lesson is_free_preview)` 🟣🟢 |
| SELECT | `is_admin()` 🟠 |
| INSERT/UPDATE/DELETE | `is_admin()` 🟠 |

## subscriptions
| Op | Rule |
|---|---|
| SELECT | read own `auth.uid() = user_id` 🔵 |
| SELECT | admin reads all `is_admin()` 🟠 |
| INSERT/UPDATE | own `auth.uid() = user_id` 🔵 ⚠️ |

> ⚠️ The legacy "insert/update own" policies remain from `schema.sql`. Production
> activation runs via the service-role Edge Functions; these client policies are a
> **noted risk** (a user could in principle write their own subscription row) —
> see [../security.md](../security.md).

## quiz_results
| Op | Rule |
|---|---|
| SELECT | read own 🔵 |
| INSERT | subscribed-or-free-preview insert: `auth.uid()=user_id AND (is_active_subscriber() OR lesson.is_free_preview)` 🟣🟢 |
| UPDATE/DELETE | — (immutable) |

## saved_subjects *(was saved_courses)*
| Op | Rule |
|---|---|
| SELECT/INSERT/DELETE | own `auth.uid() = user_id` 🔵 |

## lesson_progress
| Op | Rule |
|---|---|
| SELECT/INSERT/UPDATE | own 🔵 |
| SELECT | admin reads all 🟠 (for completion stats) |

## payments
| Op | Rule |
|---|---|
| SELECT | read own 🔵; admin reads all 🟠 |
| INSERT/UPDATE | 🔴 service-role only (no client policy — prevents forging a "paid" row) |

## books
| Op | Rule |
|---|---|
| SELECT | `status = 'published'` 🟢; admin reads all 🟠 |
| INSERT/UPDATE/DELETE | `is_admin()` 🟠 |

## book_orders
| Op | Rule |
|---|---|
| SELECT | own 🔵; admin reads all 🟠 |
| UPDATE | admin 🟠 (fulfillment) |
| INSERT | 🔴 service-role only (orders created by `create-book-checkout`) |

## user_devices
| Op | Rule |
|---|---|
| SELECT | own 🔵; admin reads all 🟠 |
| INSERT/UPDATE/DELETE | 🔴 service-role only (register/revoke Edge Functions) |

## announcements / welcome_videos
| Op | Rule |
|---|---|
| ALL (base table) | `is_admin()` 🟠 |
| public read | via `*_public` views (anon `GRANT SELECT`) 🟢 |

---

## Cross-cutting patterns
- **Admin everywhere** = `is_admin()` (reads `app_metadata`, server-set).
- **Premium read** = `is_active_subscriber()` with a per-lesson `is_free_preview`
  escape hatch that also opens to **anon**.
- **Money/devices/orders** = no client write policy; only service-role Edge
  Functions mutate them. This is the strongest layer.
- **Ownership writes** = `auth.uid() = user_id` for user-owned data.

## Known RLS risks (see [../security.md](../security.md))
1. `subscriptions` insert/update-own policies allow a user to write their own
   subscription row in principle. Mitigation: tighten to service-role-only.
2. `quiz_results.score/total` are client-computed and inserted by the user —
   the score is **not server-verified**. Low stakes, but it means quiz scores are
   trust-the-client.
3. `lesson_previews` runs `security_invoker = false` (advisor warning accepted by
   design); ensure the SELECT list never gains a premium column.
