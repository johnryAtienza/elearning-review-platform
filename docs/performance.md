# 10. Performance

Observations from the code; there is **no profiling or bundle-analysis tooling in
the repo**, so numbers below are structural, not measured. Where a metric would
need a build to confirm, it's marked *(unmeasured)*.

## Bundle size

| Factor | Observation |
|---|---|
| **Heavy deps** | `react-pdf` (+ pdf.js worker), `katex`, `@aws-sdk/*` (S3 presigner), `@fingerprintjs/fingerprintjs`, `@supabase/supabase-js`. PDF + KaTeX dominate the learning bundle. |
| **Code splitting** | **Admin app lazy-loads every page** (`lazy()` in `apps/admin/src/app/router.tsx`) → small initial admin bundle. **Landing and Portal do NOT lazy-load** routes — all pages are eagerly imported in their routers. |
| **Per-app bundles** | The subdomain split means each app only ships its own pages + shared `src`/`packages` it actually imports — landing doesn't ship admin code, etc. This is the biggest structural win. |
| **AWS SDK in the browser?** | `@aws-sdk/*` is used by `storageClient.ts` (browser presigned PUT) — a large dep. Confirm it isn't pulled into non-admin bundles *(unmeasured)*. Most R2 signing is server-side (Edge Functions), so the browser ideally only needs the PUT path in admin. |

**Opportunities:** lazy-load `react-pdf`/`PdfViewer` and `VideoPlayer` (heavy,
only needed on `LessonPage`); lazy-load Portal/Landing routes like Admin already
does; verify `@aws-sdk` isn't in the student bundle.

## Query performance

| Area | State | Note |
|---|---|---|
| **Subject search** | **client-side** in `useSubjects` (250 lines) | DB already has `tsvector` + GIN + trigram indexes ready; switching to server-side `textSearch()` is a drop-in when the catalog grows. Today the whole published catalog is fetched and filtered in the browser. |
| **Dashboard** | single RPCs (`get_dashboard_stats`, `get_saved_subjects_progress`) | one round-trip each; good. |
| **Quiz history** | `get_quiz_history(limit)` with `LIMIT` + index | bounded; good. |
| **Lesson media** | `get-signed-urls` does ~3 sequential queries (user, subscription, lesson) then parallel presigns | fine per-request; the two presigns run via `Promise.all`. |
| **Admin lists** | `admin.service.ts` uses `select(... count)` embeds | watch N+1-ish embeds on large tables *(unmeasured)*. |
| **Indexes** | partial indexes on hot predicates (`WHERE is_published/enabled/is_active`) | well-chosen; see [database/indexes.md](database/indexes.md). |

## Rendering patterns

| Pattern | Observation |
|---|---|
| **Large components** | `LessonPage` (889), `VideoPlayer` (527), `QuizModal` (1004), `LessonModal` (558), `Navbar` (628), `AdminUsersPage` (491). Big components re-render widely and are hard to memoize. |
| **No virtualization** | Lists (subjects grid, admin tables, quiz history) render all rows. Fine at small N; admin tables on large datasets will need windowing (`AdminTable` is a plain table). |
| **Optimistic UI** | saved-subjects toggles update instantly with rollback — good perceived perf. |
| **Memoization** | no systematic `React.memo`/`useMemo` strategy observed; React 19 helps but heavy pages (LessonPage) could benefit. The React Compiler is **not** enabled. |

## Caching

| Layer | Mechanism |
|---|---|
| **Public assets** | Pages proxy sets `cache-control: max-age=86400, s-maxage=604800` + ETag/304 (`_lib/serveR2.ts`). Strong CDN caching for thumbnails/covers/avatars. |
| **Signed media** | 60 s TTL — intentionally uncacheable (security > caching). |
| **Data** | **No client cache library** (no React Query/SWR). Each store/hook fetches fresh; `localStorage` only persists the `isSubscribed` hint. Re-mounting a page re-fetches. |
| **Supabase** | PostgREST responses are not app-cached; rely on DB + indexes. |

## Lazy loading
- ✅ Admin routes (`lazy`).
- ❌ Portal/Landing routes (eager).
- ❌ Heavy media components (`PdfViewer`, `VideoPlayer`) are statically imported by
  `LessonPage`.
- ✅ Lesson PDFs/videos themselves are fetched on demand via signed URLs.

## Optimization opportunities (ranked)
1. **Lazy-load `LessonPage`'s heavy children** (`react-pdf`, video player) and the
   Portal/Landing route trees — likely the biggest first-load win.
2. **Move subject search server-side** before the catalog outgrows
   "fetch-everything" (indexes already exist).
3. **Adopt a data-fetching/cache layer** (React Query/SWR) to dedupe refetches and
   add stale-while-revalidate.
4. **Split the largest components** (`QuizModal`, `LessonPage`, `Navbar`) for
   render isolation + smaller chunks.
5. **Virtualize admin tables** if datasets grow.
6. **Add bundle analysis** (`rollup-plugin-visualizer`) to CI to catch regressions
   — today there's no visibility.
7. **Confirm `@aws-sdk` scope** and tree-shake/lazy it out of student bundles.

See [recommendations.md](recommendations.md) for prioritization against other work.
