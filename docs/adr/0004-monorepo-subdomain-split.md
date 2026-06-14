# ADR 0004 — Monorepo split into three subdomain apps + shared packages

**Status:** Partially superseded for student routing (2026-06-14) · **Evidence:** git history
("Phase 3/4a–4d"), `apps/{landing,portal,admin}`, `packages/@s-class/*`,
`@s-class/constants/urls.ts`, `ARCHITECTURE.md`, `CLOUDFLARE_PAGES.md`.

Update: the app-shell split remains, but normal student access no longer uses
`portal.s-class.com.ph`. Landing, auth, and the student portal now share
`s-class.com.ph` with the portal mounted at `/portal`. Admin remains separate.

## Context
The product had grown into one SPA mixing public marketing, authenticated
learning, and an admin console. Problems: a guest downloaded admin code; auth
sessions on a shared origin blurred boundaries; and the team wanted independent
deploy/scaling and clearer ownership per surface.

## Decision
Split into **three independently deployed apps on separate subdomains**, sharing
one source tree and shared packages:
- `apps/landing` → `s-class.com.ph` (marketing + free preview)
- `apps/portal` → `portal.s-class.com.ph` (authenticated learning)
- `apps/admin` → `admin.s-class.com.ph` (role-gated CRUD)
- Shared **root `src/*`** (via `@` alias) + **`@s-class/*` packages**
  (api/auth/config/constants/types/ui).

Auth is centralized on `portal.*` (landing redirects auth routes there) because
**sessions are per-origin**; admin keeps its own same-origin `/login`.
Cross-subdomain links use `@s-class/constants/urls` helpers (full-page
navigation). Done incrementally as numbered phases so the app keeps working.

## Alternatives considered (inferred)
- **Keep one SPA with route-level code splitting** — rejected: doesn't isolate
  bundles by audience, doesn't separate sessions, weaker ownership boundaries.
- **Full polyrepo** — rejected: shared types/UI/data layer would fragment; one repo
  with workspaces keeps sharing cheap.

## Consequences
- ✅ Each audience ships only its code; clearer ownership; independent deploys.
- ✅ Per-origin sessions improve the security posture.
- ⚠️ **Mid-migration coupling:** apps still share mutable root `src/*` via alias, so
  a change there ripples across apps. A "decommission phase" will move more into
  packages.
- ⚠️ **Cross-subdomain navigation complexity** (bouncers, redirects, full-page
  links, `getRouteOwner`).
- ⚠️ **Deployment ceremony**: 3 Pages projects, env vars per project, domain swaps.
- ⚠️ **Legacy URL strings retained** to limit blast radius (see [0007](0007-course-subject-rename.md)).
