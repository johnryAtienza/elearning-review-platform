# 12. AI Context

> Condensed, high-signal context for AI assistants (Claude Code, Codex, ChatGPT).
> If you read one file before touching this repo, read this one, then open the
> specific doc you need. Pair with the repo's `CLAUDE.md` (agent instructions).

## What this is
**S Class** (`s-class.com.ph`) — a subscription eLearning **board-exam review**
platform for Filipino students (mechanical-engineering review content seeded).
React 19 SPAs + Supabase + Cloudflare R2/Pages + PayMongo. Repo name:
`elearning-review-platform`.

## System architecture (one paragraph)
A **monorepo** (npm workspaces) mid-split into **three deployable Vite apps** —
`apps/landing` (marketing + free preview), `apps/portal` (authenticated learning),
`apps/admin` (role-gated CRUD) — that **share** a root `src/*` source library (via
the `@` alias) and six `@s-class/*` packages. Data flows UI → provider-routed
`*Api.ts` facade (`@s-class/api`) → mock | Supabase service | REST. Auth/state via
Zustand (`@s-class/auth`). Backend is **Supabase** (Postgres + Auth + RLS + 11
Deno Edge Functions); media in **Cloudflare R2** delivered as 60 s signed URLs;
public images proxied via Cloudflare Pages Functions; payments via **PayMongo**.

## Major entities
`profiles` (user) · `courses` (parent grouping) · `subjects` (studyable unit) ·
`lessons` (video+pdf, premium) · `quizzes`+`quiz_questions` · `quiz_results` ·
`saved_subjects` · `lesson_progress` · `subscriptions`+`payments` ·
`books`+`book_orders` · `user_devices` · `announcements`+`welcome_videos` (CMS).

## ⚠️ Five things that will trip you up
1. **Course ≠ Subject.** A DB rename made `subjects` = what students study and
   `courses` = the parent grouping (was `categories`). **URL strings stay legacy:**
   `/courses` lists Subjects; `/course/:id` is a Subject; `/admin/courses` manages
   Subjects; `/admin/categories` manages parent Courses. Don't "fix" URLs.
2. **No runnable legacy root app.** There is **no** `src/app/router.tsx`,
   `src/main.tsx`, or root `index.html`. `src/*` is a shared library. The runnable
   units are `apps/*/src/main.tsx`. `ARCHITECTURE.md`/`CLAUDE.md` mention a
   "legacy app on 5173" — **stale**.
3. **Stale commands.** Use `npm run dev|dev:landing|dev:portal|dev:admin` and
   `npm run build:landing|:portal|:admin`. Root `npm run build`/`preview` and port
   5173 no longer exist.
4. **Schema drift.** `quiz_questions` (table), the `quizzes` parent restructure,
   `quizzes.randomize_questions`, and `subjects.thumbnail_url` were created
   **out-of-band** — not in `supabase/migrations/`. A DB built from migrations
   alone is incomplete.
5. **No tests.** No test runner is configured. Don't invent one. Verify via `tsc`
   + `npm run lint` + manual.

## Coding conventions (must follow)
- **Data access:** import the `*Api.ts` facade from `@s-class/api`, never a
  provider/service directly.
- **Routes:** import paths from `ROUTES` (`@s-class/constants/routes`); never
  hardcode `'/lesson/'+id`.
- **Cross-subdomain links:** `EXTERNAL.portal()/admin()/landing()`,
  `getAbsoluteUrl(path)` from `@s-class/constants/urls`. Never build from
  `window.location.origin`.
- **Env:** read only via `@s-class/config` (`config.*`); never `import.meta.env`
  in components/services. Never `VITE_`-prefix a secret.
- **Types:** `interface` for object shapes, `type` for unions; colocate domain
  types in `@s-class/types/<domain>.ts`.
- **Styling:** Tailwind v4 + `cn()` (clsx+tailwind-merge); prefer canonical
  utilities over arbitrary values. Primitives in `@s-class/ui`.
- **Errors:** REST → `ApiError` (`.isUnauthorized/.isForbidden/.isNotFound`);
  Supabase → check `{ data, error }`; surface via `ErrorMessage` or `sonner`.
- **TS strictness:** `noUnusedLocals/Parameters` on — unused imports fail the build.

## Folder conventions
- `apps/<app>/src/{app/router.tsx, pages, layouts, components, features}` — app-owned.
- `src/{pages, features/<name>/{components,hooks,services,data,types.ts}, layouts}` — shared.
- `packages/{api,auth,config,constants,types,ui}` — shared libraries (source-only).
- `supabase/{schema.sql, migrations, functions, seed, config.toml}` — backend.
- Dependency direction: `apps → src → packages`; packages never import apps/src.

## Development patterns
- **Provider-routed facade** for all data domains.
- **Layout-route guards** (`Protected/Guest/*Bouncer`) + **`initialize()` before
  routing** to avoid flash-redirects.
- **Store-orchestrated bootstrap:** `authStore` fans out to subscription sync,
  saved-subjects/quiz-history fetch, and device registration.
- **Server-authoritative gating:** RLS + `get-signed-urls` are the boundary;
  client checks are UX.
- **Optimistic UI with rollback** (saved subjects).

## Security boundary (do not weaken)
- **RLS** + **Edge Functions** + **60 s signed URLs** are the real security.
- **Admin role** is `app_metadata.role` — server-set only.
- Premium media keys (`lessons.video_url/reviewer_pdf_url`) are excluded from
  `lesson_previews` and never in a public proxy prefix; only `get-signed-urls`
  serves them. Free access is the per-lesson `is_free_preview` flag.

## Areas that must NOT be modified without caution
| Area | Why |
|---|---|
| `authStore.initialize()` ordering | prevents flash-to-/login + half-known-auth bugs |
| `get-signed-urls` access matrix + `verify_jwt=false` | the premium gate; guest preview depends on it |
| `lesson_previews` SELECT list | adding a premium column leaks media |
| `subscriptions` / `payments` / `book_orders` / `user_devices` write paths | money & access integrity; service-role only |
| `extend_subscription` carryover logic | billing correctness (stack vs. fresh) |
| RLS policies (`is_admin`, `is_active_subscriber`, `is_free_preview`) | the authorization core |
| Route ownership / `urls.ts` prefixes | cross-subdomain routing correctness |
| The Course↔Subject naming + legacy URL strings | "fixing" either breaks routing/queries |

## Where to look next
[overview](overview.md) · [frontend](frontend-architecture.md) ·
[backend](backend-architecture.md) · [database](database/database-overview.md) ·
[domains](business-domains/README.md) · [security](security.md) ·
[system-map](system-map.md) · [technical-debt](technical-debt.md).
