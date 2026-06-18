# Cloudflare Pages — deployment setup

This is the dashboard checklist for the Cloudflare Pages setup. Production now
has two deployed Pages projects:

- Landing/Website: `s-class.com.ph` (`/`, `/login`, `/portal/*`)
- Admin: `admin.s-class.com.ph`

Student portal routes are served by the Landing/Website app under `/portal/*`.
The standalone Portal Pages deployment has been retired. `apps/portal` remains
in the repo as source code for portal pages/components and as an isolated local
testing workspace via `npm run dev:portal`.

You'll do these steps in the Cloudflare dashboard. The repo is already prepped (per-app `vite.config.ts`, `functions/`, `_redirects`).

---

## Prerequisites

- DNS for `s-class.com.ph` is on Cloudflare (Phase 0 done).
- You have admin access to the R2 bucket used today.

---

## Common values (apply to both deployed projects)

| Field | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None / Vite (either works) |
| Node version | 20 or later (Vite 8 requires it) |
| Root directory | `/` *(monorepo root, NOT the app subdir — workspaces need root install)* |
| `NPM_CONFIG_LEGACY_PEER_DEPS` env var | `false` *(only set if install fails; usually unneeded)* |

### Environment variables (set on both deployed projects)

| Key | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://dgnpiexszwsjrqfeefmd.supabase.co` | Same as legacy `.env` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_-TYQ1TxvAMODJsxJ-75k9g_vderW1et` | Same as legacy `.env` |
| `VITE_AUTH_PROVIDER` | `supabase` | |
| `VITE_LANDING_URL` | `https://s-class.com.ph` | Landing, auth, and same-origin student portal |
| `VITE_ADMIN_URL` | `https://admin.s-class.com.ph` | |
| `VITE_APP_ENV` | `production` | Surfaced as `config.appEnv`. Set to `staging` on Preview environments. |

Set these in **Settings → Environment variables → Production** (and copy to Preview if you want branch previews to work end-to-end).

**Preview / staging env vars**: in **Settings → Environment variables → Preview**, override:

- `VITE_APP_ENV=staging`
- `VITE_LANDING_URL` / `VITE_ADMIN_URL` → the matching Landing/Admin `*.pages.dev` URLs for that branch (for example, `https://my-branch.s-class-landing.pages.dev`). The student portal uses `VITE_LANDING_URL` under `/portal`; `VITE_PORTAL_URL` is deprecated and should not be set.

### R2 binding (set on both deployed projects — for Pages Functions)

In **Settings → Functions → R2 bucket bindings**:

| Variable name | R2 bucket |
|---|---|
| `R2_BUCKET` | *(the same bucket the legacy project uses)* |

Without this, image URLs like `/covers/book-abc.webp` will 500.

**No PayMongo or service-role secrets here** — those live on Supabase (Edge Functions), not on Pages.

---

## Project 1: `s-class-landing`

| Field | Value |
|---|---|
| Project name | `s-class-landing` |
| Build command | `npm install && npm run build:landing` |
| Build output directory | `apps/landing/dist` |
| Custom domains (after first deploy) | `s-class.com.ph`, `www.s-class.com.ph` |

After first deploy, verify on `https://s-class-landing.pages.dev`:
- Home page loads with logo + content
- `/about`, `/contact`, `/faq` render
- `/login` form submits successfully
- `/portal` redirects authenticated students to `/portal/dashboard`
- guest access to `/portal/dashboard` redirects to `/login`

---

## Project 2: `s-class-admin`

| Field | Value |
|---|---|
| Project name | `s-class-admin` |
| Build command | `npm install && npm run build:admin` |
| Build output directory | `apps/admin/dist` |
| Custom domains (after first deploy) | `admin.s-class.com.ph` |

After first deploy, verify on `https://s-class-admin.pages.dev`:
- `/` redirects to `/admin` → `AdminProtectedRoute` redirects to `/login`
- Submit admin credentials → lands on `/admin` dashboard
- Submit non-admin credentials → inline error, session not kept
- `/admin/courses`, `/admin/lessons`, etc. all render
- Image-bearing pages (book covers, course thumbnails) load images via `/covers/...`, `/thumbnails/...` (requires R2 binding above)

---

## Custom domains

Current production custom domains:

- Landing/Website: `s-class.com.ph`, `www.s-class.com.ph`
- Admin: `admin.s-class.com.ph`

For each deployed project:
1. Open the new project in Pages dashboard → **Custom domains** → **Set up a custom domain**
2. Enter the target hostname (e.g. `admin.s-class.com.ph`)
3. SSL provisioning is automatic (~30s to a few minutes)
4. Verify the live domain serves the expected app

Do not reattach a separate portal hostname. Normal student traffic should stay
on the apex origin under `/portal/*`.

---

## Branch previews (free with Pages)

Each deployed project auto-deploys non-`main` branches to `https://<branch>.<project>.pages.dev`. Use this as your staging environment:

- Push a feature branch → 2 preview URLs appear (Landing and Admin)
- Test changes against the live Supabase project (since we're sharing one)
- Merge to `main` → production deploy

Optionally, you can set up `dev.s-class.com.ph` later as a stable alias to a specific branch (e.g. `develop`) on the Landing project.

---

## Known gotchas

- **Node version**: Cloudflare Pages defaults to Node 18, which is too old for Vite 8. Set `NODE_VERSION=20` (or `22`) in env vars.
- **Workspaces hoisting**: `npm install` from root hoists deps into root `node_modules/`. The `build:<app>` script then runs Vite from the app subdir, which finds those deps via Node's resolution algorithm. If you see "module not found", double-check the build command starts with `npm install` (not `cd apps/landing && npm install`).
- **`/functions/` location**: Cloudflare Pages looks for `functions/` at the **build root**, which is the project root you set (= repo root). It finds `apps/landing/functions/` at `apps/landing/` — but the Pages deploy treats `apps/landing/dist/` as the deploy root. So Cloudflare actually looks at `apps/landing/functions/` because the **build output** is at `apps/landing/dist/` and Pages convention is "functions next to the build output". This works.
- **Env var leakage**: only `VITE_*` prefixed vars are bundled into the browser. Anything not prefixed (e.g. `R2_BUCKET` binding name) is server-side only. Don't accidentally prefix secrets with `VITE_`.
- **Cache**: after env var changes, **trigger a fresh deploy** — env vars don't apply to already-built artifacts.

---

## Deferred items (track separately, not blocking Phase 4)

- CDN consolidation (`cdn.s-class.com.ph` instead of per-app `functions/` duplication)
