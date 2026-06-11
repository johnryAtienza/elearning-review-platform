# 14. Technical Debt Audit

Findings from the source audit, categorized by priority. Many are **known and
in-flight** (the Phase 1–5 refactor) — flagged as such. Severity reflects risk to
correctness/security/maintainability, not effort.

## 🔴 High priority

### H1 — Database schema drift (out-of-band objects)
The live DB diverges from `supabase/migrations/`:
- `quiz_questions` table — **no `CREATE TABLE` migration**.
- `quizzes` restructured from one-row-per-question → parent row — **no migration**.
- `quizzes.randomize_questions`, `subjects.thumbnail_url` columns — **no migration**.

**Risk:** a DB rebuilt from migrations is broken (quizzes fail); RLS for these is
in migrations but the objects they protect aren't reproducible. **Fix:** capture a
`pg_dump --schema-only` of production as a canonical baseline migration.
Refs: [database/tables.md](database/tables.md).

### H2 — `subscriptions` client-writable via RLS
Legacy `schema.sql` keeps `insert own` / `update own` policies on `subscriptions`.
A user could, in principle, write their own active subscription row → free
premium. Production activation already goes through service-role
`extend_subscription`. **Fix:** drop the client write policies.
Refs: [security.md](security.md) #1, [database/rls-policies.md](database/rls-policies.md).

### H3 — Migration set is non-deterministic to replay
Mixed naming: timestamped (`20260*`) + un-timestamped (`add_*`, `fix_*`,
`admin_*`). On `supabase db reset` the legacy `add_*` files sort **after** the
`20260606*` rename, which the rename header explicitly calls out. Plus a
maintenance script (`reset_lesson_progress.sql` — a destructive `DELETE`) sits in
`migrations/` and would run on replay. **Fix:** renumber/timestamp all migrations;
move maintenance scripts out of `migrations/`.

## 🟠 Medium priority

### M1 — Oversized components
| File | Lines |
|---|---|
| `apps/admin/.../QuizModal.tsx` | **1004** |
| `src/pages/LessonPage.tsx` | **889** |
| `apps/landing/src/layouts/Navbar.tsx` | **628** |
| `apps/admin/.../LessonModal.tsx` | 558 |
| `src/features/lessons/components/VideoPlayer.tsx` | 527 |
| `apps/admin/src/pages/admin/AdminUsersPage.tsx` | 491 |
| `packages/api/src/admin.service.ts` | **1266** (god-service) |

Hard to test/review/memoize; broad re-renders. **Fix:** extract subcomponents/hooks;
split `admin.service.ts` per domain (`admin/*.service.ts`).

### M2 — Duplicated code
- **UI primitives exist twice:** `src/components/ui/*` vs `@s-class/ui/*` (button,
  input, badge, skeleton, ErrorMessage, PageLoader). New code should use the
  package; the `src` copies are legacy.
- **Pages Functions triplicated:** `functions/` (root) + `apps/*/functions/` each
  carry the same R2 proxy + `_lib/serveR2.ts`. Planned consolidation to
  `cdn.s-class.com.ph` (`CLOUDFLARE_PAGES.md` deferred items).
- **Pricing constants duplicated** client (`subscriptionService.ts`) vs server
  (`create-checkout`/`verify-payment`). Intentional (server authoritative) but
  drift-prone — keep them in sync.

### M3 — Compatibility shims in `src/services` and `src/store`
Many files are 3-line re-exports to `@s-class/api`/`@s-class/auth`
(`src/store/authStore.ts`, `src/services/*Api.ts`, `src/config.ts`). Harmless but
two ways to import the same thing → inconsistent imports. **Fix:** codemod imports
to the packages, then delete shims (a "decommission phase" is already expected).

### M4 — No data-fetching/caching layer
Hand-rolled `async` in hooks/stores; no React Query/SWR → duplicate fetches on
re-mount, no stale-while-revalidate, manual loading/error each time. **Fix:** adopt
a query lib; big DX + perf win. Refs: [performance.md](performance.md).

### M5 — Subject search is client-side
`useSubjects` fetches the whole published catalog and filters in-browser, despite
DB `tsvector`/GIN/trigram indexes being ready. Doesn't scale past a few hundred
subjects. **Fix:** move to `textSearch()`.

### M6 — Documentation drift
`README.md` is still the Vite template; `DOCUMENTATION.md` ("PayMongo planned",
"no password reset", Vite 6, single-app structure) and `CLAUDE.md`/`ARCHITECTURE.md`
("legacy app on 5173", root `npm run build`) are partly stale. This `docs/`
knowledge base supersedes them. **Fix:** replace root `README.md`, add a banner to
the stale docs pointing here.

### M7 — Edge Function CORS `*`
All functions send `Access-Control-Allow-Origin: *`. Mitigated by JWT/ownership
checks but broad. **Fix:** restrict to known origins. Refs: [security.md](security.md) #3.

## 🟡 Low priority

### L1 — Dead/placeholder code
- `firebase` is a configured auth-provider value with **no implementation/SDK** —
  dead branch in config + `*Api.ts`.
- `rest` provider points at `localhost:3000` with no backend in-repo — an unused
  abstraction seam (kept for the provider pattern).
- `reviewerService.ts` returns a **stub** (mock reviewer content); no
  `reviewer_contents` table.
- `config.subscription.standardPricePerMonth` marked `@deprecated`.
- `dist/` (stale pre-split build output) is committed/tracked at root.

### L2 — `lesson_progress.lesson_id` is `text`, not an FK
No referential integrity; joins cast `::text`. Orphan rows possible.

### L3 — Quiz score computed client-side
`quiz_results.score/total` are trusted from the browser (RLS checks who/where, not
the value). Fine for self-study. Refs: [quizzes](business-domains/quizzes.md).

### L4 — No formatter / no CI / no monitoring
No Prettier config, no `.github/workflows`, no error tracker/uptime monitor.
Quality relies on convention + Cloudflare's build step.

### L5 — Known feature gaps (from `DOCUMENTATION.md` "Potential Improvements")
Resend-confirmation-email UI; admin manual subscription grant/revoke; lesson
drag-reorder; quiz `randomize` UI exposure; `tsconfig` `baseUrl` deprecation.

## Architectural risks & scaling concerns
| Risk | Concern |
|---|---|
| **Single Supabase project + R2 bucket across all envs** | previews/staging hit prod data; one bad migration affects prod. |
| **`src/*` shared via alias during migration** | apps are coupled to a shared mutable source tree; a change in `src/pages/LessonPage` affects landing + portal simultaneously. |
| **God service `admin.service.ts` (1266 lines)** | single chokepoint for all admin writes. |
| **No virtualization on admin tables** | large datasets degrade admin UX. |
| **No observability** | production errors are invisible beyond platform dashboards. |

## Refactoring opportunities (summary)
1. Canonical schema baseline (H1) + migration renumber (H3).
2. Lock down `subscriptions`/payment RLS (H2).
3. Split god components/services (M1).
4. Finish the package migration; delete shims + duplicate UI (M2/M3).
5. Adopt query lib + server-side search (M4/M5).
6. Replace stale root docs (M6).

Prioritized against value in [recommendations.md](recommendations.md).
