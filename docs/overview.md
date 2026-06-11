# 1. Executive Overview

## Project purpose

**S Class** (`s-class.com.ph`) is a subscription-based eLearning **review
platform for Filipino professional board-exam candidates**. The seeded content
and marketing copy target the **Mechanical Engineering board review** market
(Engineering Mathematics, Machine Design, Power & Industrial Plant Engineering),
but the data model is generic enough for any board-review program.

It delivers structured study content behind a paywall:

- **Video lessons** (HTML5 player with free-tier preview caps)
- **PDF reviewers** (page-limited viewer for free tier)
- **Per-lesson quizzes** (multiple-choice, scored, with answer review for paying users)
- **Progress tracking** (saved subjects, watched lessons, quiz history)
- **Hard-copy book sales** (e-commerce with offline/manual fulfillment)

The codebase is internally branded **"S Class"** / `@s-class/*` workspace
packages; the GitHub repository is named `elearning-review-platform`.

## Business goals

| Goal | How the platform serves it |
|---|---|
| **Monetize review content via subscriptions** | Standard tier unlocks full videos/PDFs/quiz answers; 1/3/6-month plans with multi-month discounts, paid through PayMongo (GCash / Maya). |
| **Convert browsers into subscribers** | A public marketing site + free-preview funnel (`/preview/*`) lets guests sample flagged lessons before signing up. |
| **Protect premium content** | Media is never public: short-lived (60 s) signed R2 URLs are issued by an Edge Function only after a server-side subscription check. |
| **Add a physical product line** | Sell printed reviewers (books) with stock control and manual shipping/tracking. |
| **Limit account sharing** | Netflix-style hard cap of 1 active mobile + 1 active desktop device per account. |
| **Operate cheaply at small scale** | Serverless everything (Supabase + Cloudflare Pages/R2) — no servers to run. |

## Target users

| User | Description | Where they live |
|---|---|---|
| **Reviewer / student** | A board-exam candidate studying via video + PDF + quizzes. | `apps/portal` (authenticated) |
| **Guest / prospect** | An unauthenticated visitor browsing marketing pages, the book store, and free preview lessons. | `apps/landing` |
| **Administrator** | Staff who manage courses/subjects/lessons/quizzes/books/orders/users/CMS. | `apps/admin` (role-gated) |

## High-level architecture

```mermaid
flowchart TD
  Browser["Browser"]

  subgraph Frontends["Cloudflare Pages — 3 apps"]
    Landing["apps/landing<br/>marketing + free preview<br/>s-class.com.ph"]
    Portal["apps/portal<br/>student portal<br/>portal.s-class.com.ph"]
    Admin["apps/admin<br/>admin console<br/>admin.s-class.com.ph"]
  end

  Shared["Shared source<br/>root src/* (via @ alias)<br/>packages/* (@s-class/*)"]

  subgraph Backend["Supabase project"]
    Auth["Auth (JWT sessions)"]
    PG["Postgres + RLS"]
    Edge["Edge Functions (Deno)<br/>payments · signed URLs · devices · uploads"]
  end

  R2["Cloudflare R2<br/>videos · PDFs · thumbnails · covers · avatars"]
  PagesFns["Pages Functions<br/>public R2 asset proxy"]
  PayMongo["PayMongo<br/>checkout + webhooks"]

  Browser --> Landing & Portal & Admin
  Landing & Portal & Admin --> Shared
  Shared --> Auth & PG
  Shared -->|invoke| Edge
  Edge --> PG
  Edge -->|presign / read| R2
  Edge <-->|charge / verify| PayMongo
  Landing & Portal & Admin -->|/thumbnails /covers /avatars /quizzes| PagesFns --> R2
```

**The defining architectural ideas:**

1. **Provider-routed service layer.** Every data domain has a `*Api.ts` facade
   that fans out to mock / REST / Supabase backends based on env flags. UI never
   imports a backend directly. See
   [adr/0005-provider-routed-service-layer.md](adr/0005-provider-routed-service-layer.md).
2. **RLS is the real security boundary.** Route guards and tier checks in React
   are UX only; Postgres Row-Level Security and Edge Functions are what actually
   enforce access. See [security.md](security.md).
3. **Signed-URL content protection.** Premium media URLs are never in client-readable
   tables/views; the `get-signed-urls` Edge Function is the only path to R2 for
   premium content. See [adr/0008-signed-url-content-protection.md](adr/0008-signed-url-content-protection.md).
4. **Subdomain split monorepo.** Three independently deployed Cloudflare Pages
   projects share one source tree and one Supabase backend. See
   [adr/0004-monorepo-subdomain-split.md](adr/0004-monorepo-subdomain-split.md).

## Major modules

| Module | Lives in | Responsibility |
|---|---|---|
| **Landing app** | `apps/landing` | Public marketing, book storefront (browse), pricing, `/preview/*` funnel. Hands auth off to portal. |
| **Portal app** | `apps/portal` | Authenticated learning: dashboard, subjects, lessons, quizzes, subscription, profile, devices, book checkout. |
| **Admin app** | `apps/admin` | Role-gated CRUD for subjects/lessons/quizzes/books/orders/users/CMS. |
| **Shared `src/*`** | `src/` | Cross-app pages (`LessonPage`, `SubjectDetailPage`, `SubscriptionPage`), feature components/hooks, portal layout. |
| **`@s-class/api`** | `packages/api` | Browser-safe data layer: Supabase/REST clients, provider routers, services, mocks. |
| **`@s-class/auth`** | `packages/auth` | Zustand auth/saved-subjects/quiz-history stores + route guards. |
| **`@s-class/config`** | `packages/config` | Single sanctioned reader of `import.meta.env`. |
| **`@s-class/constants`** | `packages/constants` | Route strings + cross-subdomain URL helpers. |
| **`@s-class/types`** | `packages/types` | Shared domain TypeScript types. |
| **`@s-class/ui`** | `packages/ui` | Primitive UI components + `cn()`. |
| **Edge Functions** | `supabase/functions` | 11 Deno functions for payments, signed URLs, devices, uploads. |
| **Database** | `supabase/` | Postgres schema + 30 migrations, RLS, RPCs, views. |

## Key features (current)

- ✅ Email/password auth (Supabase) with email confirmation + **password reset**
- ✅ Public marketing site + FAQ/About/Contact
- ✅ Subject catalog with search/filter/sort + Week→Day curriculum grid
- ✅ Premium video & PDF with free-tier preview caps + signed-URL delivery
- ✅ Per-lesson quizzes with scoring, answer review, and **persisted attempt history**
- ✅ **Free-preview** lessons (per-lesson `is_free_preview` flag; guests included)
- ✅ Subscriptions via **PayMongo** (GCash/Maya), carryover extension, idempotent verification
- ✅ Book storefront + **checkout with stock control** and manual fulfillment
- ✅ Saved subjects, lesson progress, dashboard stats
- ✅ **Device limiting** (1 mobile + 1 desktop) via fingerprint + Edge Function
- ✅ Homepage **CMS** (announcements + welcome video) managed in admin
- ✅ Admin console for all of the above

## Current project status

The project is **pre-/early-production and mid-refactor**. Recent git history is
dominated by **"Phase 4"** — the monorepo/subdomain split:

```
177988e refactor(admin): Phase 4d — extract Admin to apps/admin/
2677f8e refactor(portal): Phase 4c-3 — move dashboard/subjects/quiz cluster to apps/portal/
9d9fd37 refactor(portal): Phase 4c-1 — move auth cluster to apps/portal/
25b87f8 refactor(landing): Phase 4b — move Landing-owned files to apps/landing/
a188dfa feat(portal): Phase 3 — Portal is learning-only
```

What this means for a new developer:

- The **three apps are the runnable units**; the old single SPA on port 5173 is
  gone (no `index.html`/`main.tsx`/`router.tsx` at repo root).
- Shared code is split between **root `src/*`** (still large) and **`packages/*`**.
  A "future decommission phase" is expected to move more of `src/*` into packages.
- **URL strings remain legacy** (`/courses`, `/admin/categories`) even though the
  DB and types now use the Course→Subject vocabulary. A separate URL-migration
  sprint is planned.
- Deployment is being moved to **three Cloudflare Pages projects**; the
  domain-swap checklist is in `CLOUDFLARE_PAGES.md`.

See [technical-debt.md](technical-debt.md) for the in-flight cleanup backlog and
[recommendations.md](recommendations.md) for prioritized next steps.
