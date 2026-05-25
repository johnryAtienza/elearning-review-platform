# Cloudflare Pages — per-app deployment setup

This is the dashboard checklist for migrating from the legacy single Pages project to **three separate Pages projects**, one per subdomain. Created during Phase 4 of the monorepo split.

You'll do these steps in the Cloudflare dashboard. The repo is already prepped (per-app `vite.config.ts`, `functions/`, `_redirects`).

---

## Prerequisites

- DNS for `s-class.com.ph` is on Cloudflare (Phase 0 done).
- Legacy Pages project (the one serving the current single-SPA) is still running. Don't touch it until the new projects are verified.
- You have admin access to the R2 bucket used today.

---

## Common values (apply to all 3 projects)

| Field | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None / Vite (either works) |
| Node version | 20 or later (Vite 8 requires it) |
| Root directory | `/` *(monorepo root, NOT the app subdir — workspaces need root install)* |
| `NPM_CONFIG_LEGACY_PEER_DEPS` env var | `false` *(only set if install fails; usually unneeded)* |

### Environment variables (set on every project)

| Key | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://dgnpiexszwsjrqfeefmd.supabase.co` | Same as legacy `.env` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_-TYQ1TxvAMODJsxJ-75k9g_vderW1et` | Same as legacy `.env` |
| `VITE_AUTH_PROVIDER` | `supabase` | |
| `VITE_LANDING_URL` | `https://s-class.com.ph` | For cross-domain redirects |
| `VITE_PORTAL_URL` | `https://portal.s-class.com.ph` | |
| `VITE_ADMIN_URL` | `https://admin.s-class.com.ph` | |
| `VITE_APP_ENV` | `production` | Surfaced as `config.appEnv`. Set to `staging` on Preview environments. |

Set these in **Settings → Environment variables → Production** (and copy to Preview if you want branch previews to work end-to-end).

**Preview / staging env vars**: in **Settings → Environment variables → Preview**, override:

- `VITE_APP_ENV=staging`
- `VITE_LANDING_URL` / `VITE_PORTAL_URL` / `VITE_ADMIN_URL` → the matching `*.pages.dev` URLs for that project (e.g. `https://my-branch.s-class-landing.pages.dev`). This keeps a branch's three apps wired to each other instead of cross-linking into production.

### R2 binding (set on every project — for Pages Functions)

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
- `/login` form submits successfully (creates session on `s-class-landing.pages.dev` origin)

---

## Project 2: `s-class-portal`

| Field | Value |
|---|---|
| Project name | `s-class-portal` |
| Build command | `npm install && npm run build:portal` |
| Build output directory | `apps/portal/dist` |
| Custom domains (after first deploy) | `portal.s-class.com.ph` |

After first deploy, verify on `https://s-class-portal.pages.dev`:
- `/` redirects to `/dashboard`
- Unauth: currently redirects to landing's `/login` (cross-origin) — **this will create an infinite redirect in production** once portal is on its own subdomain. **Fix this before the domain swap** by adding a same-origin portal `/login` (deferred follow-up flagged in the plan).
- `/courses`, `/lesson/:id` browse works (public)
- After login (whichever flow we settle on), `/dashboard`, `/profile`, `/subscription` render

---

## Project 3: `s-class-admin`

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

## Custom domain swap (do LAST, one at a time)

The legacy Pages project owns `s-class.com.ph`, `portal.s-class.com.ph`, `admin.s-class.com.ph` right now (per Phase 0). To swap:

### Order: admin → portal → landing (apex last)

For each new project:
1. Open the new project in Pages dashboard → **Custom domains** → **Set up a custom domain**
2. Enter the target hostname (e.g. `admin.s-class.com.ph`)
3. Cloudflare detects the existing CNAME on the legacy project → asks to **transfer**
4. Confirm the transfer
5. SSL provisioning is automatic (~30s to a few minutes)
6. Verify the live domain serves the new app
7. **Rollback if needed**: re-add the same domain to the legacy project (one click).

### Why this order

Admin is the lowest-traffic, easiest to verify. Portal is mid-risk (real users). Apex is highest-stakes (marketing + SEO) — do it last after you're confident in the pattern.

After the apex swap, the legacy Pages project has no custom domains and can be decommissioned (per Phase 5 cleanup).

---

## Branch previews (free with Pages)

Each project auto-deploys non-`main` branches to `https://<branch>.<project>.pages.dev`. Use this as your staging environment:

- Push a feature branch → 3 preview URLs appear (one per project)
- Test changes against the live Supabase project (since we're sharing one)
- Merge to `main` → production deploy

Optionally, you can set up `dev.s-class.com.ph` later as a stable alias to a specific branch (e.g. `develop`) on any of the projects.

---

## Known gotchas

- **Node version**: Cloudflare Pages defaults to Node 18, which is too old for Vite 8. Set `NODE_VERSION=20` (or `22`) in env vars.
- **Workspaces hoisting**: `npm install` from root hoists deps into root `node_modules/`. The `build:<app>` script then runs Vite from the app subdir, which finds those deps via Node's resolution algorithm. If you see "module not found", double-check the build command starts with `npm install` (not `cd apps/landing && npm install`).
- **`/functions/` location**: Cloudflare Pages looks for `functions/` at the **build root**, which is the project root you set (= repo root). It finds `apps/landing/functions/` at `apps/landing/` — but the Pages deploy treats `apps/landing/dist/` as the deploy root. So Cloudflare actually looks at `apps/landing/functions/` because the **build output** is at `apps/landing/dist/` and Pages convention is "functions next to the build output". This works.
- **Env var leakage**: only `VITE_*` prefixed vars are bundled into the browser. Anything not prefixed (e.g. `R2_BUCKET` binding name) is server-side only. Don't accidentally prefix secrets with `VITE_`.
- **Cache**: after env var changes, **trigger a fresh deploy** — env vars don't apply to already-built artifacts.

---

## Deferred items (track separately, not blocking Phase 4)

- Portal same-origin `/login` (needed before portal domain swap actually serves users — see plan file)
- Subdomain-aware Navbar links (cross-app `<Link>` → `<a href={EXTERNAL.*}>`)
- CDN consolidation (`cdn.s-class.com.ph` instead of per-app `functions/` duplication)
