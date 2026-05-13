# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Subscription-based eLearning platform for Filipino professional board exam reviewers. React 19 + Vite SPA hosted on Cloudflare Pages, backed by Supabase (Postgres + Auth + Edge Functions) and Cloudflare R2 (S3-compatible storage for video/PDF). PayMongo handles payments (GCash / Maya / cards).

The most exhaustive reference is `DOCUMENTATION.md` in the repo root — consult it before adding non-trivial features. Note that some sections (e.g. "PayMongo planned", "no password reset flow") are out of date: those flows now exist in the codebase.

## Commands

```bash
npm run dev        # Vite dev server on http://localhost:5173
npm run build      # Type-check (tsc -b) THEN bundle — the build will fail on any TS error
npm run lint       # ESLint over all .ts/.tsx
npm run preview    # Serve the production bundle locally
npx tsc --noEmit   # Type-check without emitting (faster than full build)
```

There is no test runner configured in `package.json` — do not invent one.

### Supabase

```bash
supabase db push                       # Apply migrations in supabase/migrations/
supabase functions deploy <name>       # Deploy a single Edge Function
supabase secrets set KEY=value         # Set server-side secret (PayMongo, R2, etc.)
supabase start                         # Local stack (Docker required)
```

Edge Functions live in `supabase/functions/` (Deno runtime). They are the only place credentials for R2 and PayMongo are allowed to exist — never expose those to the browser.

## Architecture

### Provider-routed service layer

This is the most important pattern in the repo. Every data domain has a "router" file that fans out to one of three providers based on env vars:

```
courseApi.ts ──┬──> COURSES (mock data)         when VITE_USE_MOCK=true
               ├──> course.service.ts (Supabase) when VITE_AUTH_PROVIDER=supabase
               └──> apiClient.ts (REST)          otherwise
```

The same shape exists for `authApi`, `lessonApi`, `quizApi`. Components and hooks **must import the `*Api.ts` router**, never a provider directly. To add a new domain, follow this two-layer pattern (see `DOCUMENTATION.md` §3 "Adding a New Feature").

`src/config.ts` is the single sanctioned reader of `import.meta.env`. Everywhere else imports from `@/config`.

### Auth, route guards, and session bootstrap

- Routes are declared once in `src/app/router.tsx` using `createBrowserRouter`.
- Three guards wrap route subtrees: `GuestRoute` (kick logged-in users away), `ProtectedRoute` (require session), `ProtectedAdminRoute` (require `user.role === 'admin'`).
- `authStore.initialize()` runs at app mount and restores the Supabase session before route guards make any redirect decision — `isInitializing` blocks rendering until that completes. This is what prevents the "flash to /login on refresh" bug; don't bypass it.
- Admin role lives in `auth.users.app_metadata.role` and can only be set server-side (SQL or Supabase dashboard).

### Content-protection security model

Premium video/PDF URLs are **never** stored in the client-visible `lesson_previews` view. To play a lesson:

1. Client calls the `get-signed-urls` Edge Function with the JWT + lessonId.
2. Edge Function checks `subscriptions` table for an active tier.
3. Returns short-lived (60s) presigned R2 GET URLs scoped to that lesson.
4. Free tier gets the same URLs but the client-side `VideoPlayer` / `PdfViewer` enforce the preview limits (`VITE_FREE_VIDEO_PREVIEW_SECONDS`, `VITE_FREE_PDF_MAX_PAGES`).

**RLS is the actual security boundary** — frontend tier checks and route guards are UX only. When touching anything related to subscription gating, the test that matters is "does an unsubscribed user, calling the Edge Function or the DB directly, get blocked?"

### State (Zustand)

Three stores in `src/store/`:

- `authStore` — user, `isAuthenticated`, `isAdmin`, `isSubscribed`, `subscription`, `isInitializing`. Persisted via `zustand/middleware`. Call `syncSubscription()` after login/initialize and after any successful subscribe action.
- `quizStore` — answers + scored result for the active quiz. Not persisted.
- `savedCoursesStore` — saved IDs, per-course progress, dashboard stats. Uses optimistic updates with rollback on failure.

### Payment flow (PayMongo)

Three Edge Functions implement payment, in this order:

1. `create-checkout` — client requests it with a plan duration; function calls PayMongo and returns the hosted checkout URL.
2. `paymongo-webhook` — PayMongo POSTs payment events here; webhook signature is verified using `PAYMONGO_WEBHOOK_SECRET`.
3. `verify-payment` — client polls/calls this after redirect to confirm the payment landed and trigger `extend_subscription()`.

`PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` are set via `supabase secrets set` — they must never be prefixed with `VITE_`.

### Database

`supabase/schema.sql` holds the initial schema; everything since is a numbered migration in `supabase/migrations/` (apply in filename order). `extend_subscription(user_id, duration_months, tier)` is the carryover-aware RPC used by the subscribe flow — extending an active subscription stacks months onto the existing expiry rather than restarting.

## Conventions

- **Path alias:** `@/*` → `./src/*` (configured in `tsconfig.app.json` and `vite.config.ts`).
- **Route strings:** always import from `src/constants/routes.ts` (e.g. `ROUTES.LESSON(id)`), never hardcode `/lesson/${id}`.
- **Tailwind:** v4 with `@tailwindcss/vite`. Use `cn()` from `src/utils/cn.ts` for conditional class merging. Prefer canonical utility classes over arbitrary values like `w-[60px]`.
- **TypeScript:** `strict`, `noUnusedLocals`, `noUnusedParameters` are on — unused imports/vars fail the build. Use `interface` for object shapes, `type` for unions/aliases. Colocate types in `features/<name>/types.ts`.
- **Errors:** `ApiError` (REST) exposes `.isUnauthorized`, `.isForbidden`, `.isNotFound`. Supabase calls return `{ data, error }` — always check `error` before using `data`. Surface user-facing errors via the `ErrorMessage` component or `sonner` toasts.
- **Feature folders:** colocate components, hooks, services, mock data, and types in `src/features/<name>/`. Promote to `src/components/` or `src/services/` only when something is genuinely shared across features.

## Environment

`.env` is git-ignored; `.env.example` is the template. Key flags:

- `VITE_AUTH_PROVIDER` = `mock` | `rest` | `supabase` (production uses `supabase`).
- `VITE_USE_MOCK=true` plus `VITE_AUTH_PROVIDER=mock` lets you run the entire app offline against `src/features/*/data/`.
- Anything `VITE_*` is bundled into the browser. **Never** put secrets behind that prefix — R2 / PayMongo / service-role keys belong in `supabase secrets set`.
