# 11. Developer Guide

## Prerequisites
- **Node.js 20+** (Vite 8 requirement)
- **npm** (workspaces; do not use pnpm/yarn here)
- **Supabase CLI** — `npm install -g supabase` (for migrations/functions; Docker for local stack)
- **Git**

## Local setup
```bash
git clone https://github.com/johnryAtienza/elearning-review-platform.git
cd elearning-review-platform

# Install once at the ROOT — workspaces hoist deps for all apps/packages
npm install

# Env: .env.development (committed) already wires local app URLs.
# For Supabase mode, ensure VITE_SUPABASE_URL / _ANON_KEY are set (see .env.example).
cp .env.example .env   # then edit as needed

# Run all three apps together:
npm run dev            # landing :5174 · portal :5175 · admin :5176
```

### Fully offline (no backend)
```env
VITE_USE_MOCK=true
VITE_AUTH_PROVIDER=mock
```
Serves local mock data from `@s-class/api/data/*` — no network calls.

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | all three apps (alias of `dev:all`, via `concurrently`) |
| `npm run dev:landing` / `:portal` / `:admin` | one app (5174/5175/5176) |
| `npm run build:landing` / `:portal` / `:admin` | `tsc --noEmit && vite build` → `apps/<app>/dist` |
| `npm run lint` | ESLint over the repo |
| `npm run type-check` | `tsc -b` + per-workspace type-check |
| `npx tsc --noEmit -p apps/<app>/tsconfig.json` | fast type-check of one app |

> ⚠️ **Stale docs:** `CLAUDE.md`/`DOCUMENTATION.md` reference `npm run dev` on
> port 5173, a root `npm run build`, and `npm run preview`. Those describe the
> pre-split single app and **no longer exist** in `package.json`. Use the
> per-app scripts above.

### Supabase
```bash
supabase db push                  # apply supabase/migrations in order
supabase functions deploy <name>  # deploy one Edge Function
supabase secrets set KEY=value    # server-side secrets (PayMongo, R2)
supabase start                    # local stack (Docker)
```
> ⚠️ Building the DB purely from migrations is **incomplete** — the `quiz_questions`
> table, the `quizzes` parent restructure, and `subjects.thumbnail_url` were
> created out-of-band. See [database/tables.md](database/tables.md). Prefer
> branching from a production schema dump until a canonical baseline exists.

## There is no test runner
`package.json` has **no `test` script** and no test framework is installed. Do
**not** invent one. "Verification" today = `tsc` (build fails on any TS error) +
`npm run lint` + manual checks in the running apps.

## Development workflow
1. **Branch** off `develop` (or `main`). Don't commit straight to the default branch.
2. **Find the layer.** UI → `apps/*` or `src/features|pages`; data → `@s-class/api`
   facade; types → `@s-class/types`; routes → `@s-class/constants/routes`.
3. **Respect the patterns:** import the `*Api.ts` facade (never a provider);
   import paths from `ROUTES`; cross-origin links via `@s-class/constants/urls`;
   read env only through `@s-class/config`; merge classes with `cn()`.
4. **Type-check + lint** before pushing (`tsc -b`, `npm run lint`).
5. **DB change?** add a **timestamped** migration
   (`YYYYMMDDHHMMSS_description.sql`) in `supabase/migrations/`; never edit an
   applied one. Update RLS in the same migration.
6. **Edge Function change?** test locally / deploy with `supabase functions deploy`.
7. Open a PR → preview URLs appear → verify → merge to `main` → production deploy.

### Adding a new data domain (the canonical recipe)
1. Type in `@s-class/types/<domain>.ts`.
2. Supabase queries in `packages/api/src/<domain>.service.ts`.
3. Facade `packages/api/src/<domain>Api.ts` (mock/supabase/rest switch) + export
   from `packages/api/src/index.ts`.
4. (If global state) a Zustand store.
5. Page(s) in the owning app or `src/pages`; route in that app's
   `app/router.tsx`; path constant in `@s-class/constants/routes.ts`.

### Adding an admin page
1. `apps/admin/src/pages/admin/AdminXxxPage.tsx` (+ skeleton if heavy).
2. CRUD in `packages/api/src/admin.service.ts`.
3. Modal in `apps/admin/src/features/admin/components/XxxModal.tsx`.
4. Register under `AdminProtectedRoute` in `apps/admin/src/app/router.tsx`
   (lazy-loaded) + add to `NAV_ITEMS`/`ROUTE_LABELS` in `AdminLayout.tsx`.

## Branch strategy
- `main` — production (auto-deploys to the 3 Pages projects).
- `develop` — integration (current working branch).
- `feature/*` — feature branches (e.g. `feature/revamp`, `feature/codex` exist).
- Branch pushes get `*.pages.dev` previews used as staging.
- This repo follows a **manual-git** convention for the maintainer (commit/push by
  hand) — agents should stop after verification and propose, not auto-commit.

## Deployment
Cloudflare Pages auto-deploys on push to `main`. Per-app build commands + env vars
+ R2 binding are in `CLOUDFLARE_PAGES.md`. Post-deploy: Supabase Auth URL config,
R2 CORS, `supabase functions deploy`, `supabase db push`. See
[environments.md](environments.md).

## Troubleshooting
| Symptom | Likely cause | Fix |
|---|---|---|
| "module not found" on Pages build | install ran in app subdir, not root | build command must start with `npm install` at root |
| Build fails on Pages, ok locally | Node 18 default on Pages | set `NODE_VERSION=20+` |
| PROD build throws "Missing required env var: VITE_*_URL" | public origin URL unset | set `VITE_LANDING_URL` and `VITE_ADMIN_URL` |
| Cross-app link 404s / wrong origin | hardcoded URL or `window.location.origin` | use `EXTERNAL.*` / `getAbsoluteUrl` from `@s-class/constants/urls` |
| Image `/thumbnails/...` returns 500 | R2 binding missing | add `R2_BUCKET` binding to the Pages project |
| Logged in on landing, portal says guest | route served from wrong origin or stale build | normal student access must use `s-class.com.ph/login` and `s-class.com.ph/portal` |
| Premium video won't play for a paid user | subscription not synced | `authStore.syncSubscription()` after subscribe; check `subscriptions.expires_at` |
| Infinite redirect to /login on portal | guest hitting protected route w/o same-origin login | ensure portal `/login` exists (it does post-Phase-4); check `PortalProtectedRoute` |
| Flash of /login on refresh | bypassing `isInitializing` | never render routes before `authStore.initialize()` resolves |
| Fresh DB missing quizzes | out-of-band `quiz_questions` not in migrations | restore from prod schema dump |
| TS build fails on unused var | `noUnusedLocals/Parameters` | remove the unused import/var |
