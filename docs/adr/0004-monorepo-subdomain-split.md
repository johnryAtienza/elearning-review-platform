# ADR 0004 — Monorepo split into app shells + shared packages

**Status:** Superseded for student deployment/routing (2026-06-18) · **Evidence:** git history
("Phase 3/4a–4d"), `apps/{landing,portal,admin}`, `packages/@s-class/*`,
`@s-class/constants/urls.ts`, `ARCHITECTURE.md`, `CLOUDFLARE_PAGES.md`.

Update: the app-shell split remains, but the standalone student Portal Pages
deployment has been retired. Landing, auth, and student portal routes now share
`s-class.com.ph` with the portal mounted at `/portal`. Admin remains separate.
`apps/portal` remains as source code and as an isolated local test workspace.

## Context
The product had grown into one SPA mixing public marketing, authenticated
learning, and an admin console. Problems: a guest downloaded admin code; auth
sessions on a shared origin blurred boundaries; and the team wanted independent
deploy/scaling and clearer ownership per surface.

## Decision
Originally split into **three app shells** sharing one source tree and shared
packages. Current production deployment keeps two Pages projects:

- `apps/landing` → `s-class.com.ph` (marketing, auth, free preview, `/portal/*`)
- `apps/admin` → `admin.s-class.com.ph` (role-gated CRUD)
- `apps/portal` → source/local workspace for authenticated learning routes
- Shared **root `src/*`** (via `@` alias) + **`@s-class/*` packages**
  (api/auth/config/constants/types/ui).

Auth is centralized on the Landing/Website origin because **sessions are
per-origin** and student routes live under `/portal/*` on the same host; admin
keeps its own same-origin `/login`. Cross-origin links use
`@s-class/constants/urls` helpers (full-page navigation). Done incrementally as
numbered phases so the app keeps working.

## Alternatives considered (inferred)
- **Keep one SPA with route-level code splitting** — rejected: doesn't isolate
  bundles by audience, doesn't separate sessions, weaker ownership boundaries.
- **Full polyrepo** — rejected: shared types/UI/data layer would fragment; one repo
  with workspaces keeps sharing cheap.

## Consequences
- ✅ Landing/Website and Admin ship separately; clearer ownership for public/student and admin surfaces.
- ✅ Per-origin sessions improve the security posture.
- ⚠️ **Mid-migration coupling:** apps still share mutable root `src/*` via alias, so
  a change there ripples across apps. A "decommission phase" will move more into
  packages.
- ⚠️ **Cross-origin navigation complexity** remains for admin handoffs, PayMongo
  return URLs, and `getRouteOwner`.
- ⚠️ **Deployment ceremony**: 2 Pages projects plus shared env vars/R2 bindings.
- ⚠️ **Legacy URL strings retained** to limit blast radius (see [0007](0007-course-subject-rename.md)).
