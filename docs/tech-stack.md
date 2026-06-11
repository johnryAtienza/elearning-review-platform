# 2. Technology Stack

Versions below are taken from the root `package.json`, each app's `package.json`,
and `packages/*/package.json`. The repo uses **npm workspaces** (`apps/*`,
`packages/*`); most runtime deps are declared at the root and hoisted.

> Note: `DOCUMENTATION.md` lists Vite 6 / React Router "7.13.2"; the actual
> root `package.json` pins **Vite 8** and React Router 7. This file follows
> `package.json`.

## Frontend

| Concern | Choice | Version | Why / Where |
|---|---|---|---|
| **UI framework** | React | `^19.2.4` | Industry-standard SPA library; React 19 used across all three apps. Function components + hooks only. |
| **Language** | TypeScript | `~5.9.3` | `strict`, `noUnusedLocals`, `noUnusedParameters` on (`tsconfig.app.json`). Build fails on any TS error. |
| **Routing** | react-router-dom | `^7.13.2` | `createBrowserRouter` per app (`apps/*/src/app/router.tsx`). Data-router API; guards as layout routes. |
| **State** | Zustand | `^5.0.12` | Minimal hook stores. `@s-class/auth` (auth, saved subjects, quiz history) + `src/store/quizStore.ts` (active quiz). Auth store persisted via `zustand/middleware`. |
| **Styling** | Tailwind CSS v4 | `^4.2.2` | Via `@tailwindcss/vite` plugin (no PostCSS config). Conditional classes through `cn()` (clsx + tailwind-merge). |
| **UI primitives** | Radix Slot + CVA | `@radix-ui/react-slot ^1.2.4`, `class-variance-authority ^0.7.1` | `@s-class/ui` button/badge/etc. use CVA variants and Radix `Slot` for `asChild`. shadcn-style (`components.json` present). |
| **Icons** | lucide-react | `^1.7.0` | Used app-wide and stored by name in CMS (`announcements.icon`). |
| **Math rendering** | KaTeX | `^0.16.45` (`@types/katex`) | `src/components/MathText.tsx` renders LaTeX in quiz questions. |
| **PDF viewing** | react-pdf | `^10.4.1` | `src/features/lessons/components/PdfViewer.tsx`, page-limited for free tier. |
| **Toasts** | sonner | `^2.0.7` | User-facing success/error notifications (`src/lib/toast.ts`). |
| **Device fingerprint** | @fingerprintjs/fingerprintjs | `^5.2.0` | `packages/api/src/fingerprint.ts` → device-limit feature. |
| **Animations** | tw-animate-css | `^1.4.0` | Tailwind animation utilities. |

**Validation & data fetching.** There is **no dedicated form-validation library**
(no Zod/Yup/react-hook-form) and **no data-fetching/cache library** (no React
Query/SWR). Forms use controlled React state with manual validation; data
fetching is hand-rolled `async` calls in hooks/stores against the
provider-routed `*Api.ts` facades. This is a deliberate-simplicity choice and a
noted improvement opportunity — see [recommendations.md](recommendations.md).

## Backend

| Concern | Choice | Why / Where |
|---|---|---|
| **Database** | Supabase Postgres | Single managed Postgres. Schema in `supabase/schema.sql` + 30 migrations in `supabase/migrations/`. Project id `dgnpiexszwsjrqfeefmd` (`supabase/config.toml`). |
| **Auth** | Supabase Auth | Email/password, JWT sessions persisted in `localStorage`. Admin role in `auth.users.app_metadata.role` (server-set only). |
| **Authorization** | Postgres RLS | The real access boundary. Helper fns `is_admin()`, `is_active_subscriber()`, `get_user_tier()`. See [database/rls-policies.md](database/rls-policies.md). |
| **Object storage** | Cloudflare R2 (S3-compatible) | Videos, PDFs, thumbnails, covers, avatars, quiz images. Accessed server-side via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. |
| **Serverless logic** | Supabase Edge Functions (Deno) | 11 functions in `supabase/functions/`. The only place R2/PayMongo credentials may exist. |
| **Payments** | PayMongo | Hosted checkout (GCash, Maya). `create-checkout` / `verify-payment` / `paymongo-webhook` (+ book variants). |
| **Public asset CDN** | Cloudflare Pages Functions | `functions/<prefix>/[[path]].ts` proxy allowed R2 prefixes (`thumbnails/ avatars/ quizzes/ covers/`) with cache headers. Shared logic in `_lib/serveR2.ts`. |

### Edge Functions inventory

| Function | Lines | Role |
|---|---|---|
| `get-signed-urls` | 184 | **Authoritative premium-content gate.** Returns 60 s R2 GET URLs after preview/subscription/admin check. `verify_jwt=false` (guest preview allowed; in-function authz). |
| `generate-upload-url` | 108 | Admin presigned PUT to R2 for browser uploads. |
| `create-checkout` | 156 | Create PayMongo subscription checkout session. |
| `verify-payment` | 204 | Verify session, call `extend_subscription`, idempotent via `payments`. |
| `paymongo-webhook` | 203 | Server-to-server subscription payment events. |
| `subscribe` | 102 | Direct subscription extension (admin/dev path). |
| `create-book-checkout` | 274 | Book checkout + atomic stock decrement. |
| `verify-book-payment` | 176 | Verify book payment, record order state. |
| `book-paymongo-webhook` | 215 | Server-to-server book payment events. |
| `register-device` | 229 | Register/touch device; enforce 1 mobile + 1 desktop cap. |
| `revoke-device` | 103 | Deactivate a device to free a slot. |

## Infrastructure

| Concern | Choice | Why / Where |
|---|---|---|
| **Hosting** | Cloudflare Pages | Static SPA hosting + colocated Pages Functions. Target: 3 projects (`s-class-landing/-portal/-admin`) — see `CLOUDFLARE_PAGES.md`. |
| **CDN** | Cloudflare (Pages + R2) | Public assets proxied through Pages Functions with `cache-control: max-age=86400, s-maxage=604800`. A dedicated `cdn.s-class.com.ph` is a planned consolidation. |
| **DNS / domains** | Cloudflare | Apex `s-class.com.ph` (landing) + `portal.`/`admin.` subdomains. |
| **SPA routing** | Pages `_redirects` | `apps/portal/public/_redirects` does SPA fallback + 301s of marketing paths to landing. The `/index.html 200` first line dodges Cloudflare's redirect-loop detector. |
| **Build/deploy trigger** | Pages git integration | Auto-deploy on push to `main`; branch pushes get `*.pages.dev` preview URLs used as staging. |
| **Monitoring** | *(none configured)* | No error tracker (Sentry), analytics, or uptime monitor found in the repo. Edge Functions use `console.*`; Supabase/Cloudflare dashboards are the only observability. See [recommendations.md](recommendations.md). |
| **CI/CD** | *(none in-repo)* | No `.github/workflows`, no pipeline config. "CI" is effectively Cloudflare Pages' build step (`tsc --noEmit && vite build`). |

## Development tooling

| Concern | Choice | Version | Notes |
|---|---|---|---|
| **Build tool** | Vite | `^8.0.1` | Per-app `vite.config.ts`. `@` alias → repo-root `src`; `envDir`/`publicDir` point at repo root. Requires Node 20+. |
| **Package manager** | npm workspaces | — | Root declares `workspaces: ["apps/*","packages/*"]`. Install once at root. |
| **Linting** | ESLint 9 (flat config) | `^9.39.4` | `eslint.config.js`: `js.recommended` + `typescript-eslint` + `react-hooks` + `react-refresh`. |
| **Type-checking** | tsc | `~5.9.3` | `tsc -b` (project refs) at root; each app build runs `tsc --noEmit -p tsconfig.json && vite build`. |
| **Formatting** | *(no Prettier config)* | — | No `.prettierrc`. Style is convention-enforced, not tool-enforced. |
| **Testing** | *(none)* | — | **No test runner is configured.** `package.json` has no `test` script. Do not invent one. Verification = type-check + lint + manual. |
| **Concurrency** | concurrently | `^9.1.0` | `dev:all` runs landing+portal+admin together. |
| **CF Functions types** | @cloudflare/workers-types | `^4.x` | Types for Pages Functions (`R2Bucket`, `PagesFunction`). |

## Notable stack characteristics & gaps

- **No backend server of our own.** All custom server logic is Deno Edge Functions.
- **`firebase` is a stubbed auth provider option** in `@s-class/config`
  (`VITE_AUTH_PROVIDER=firebase`) but there is **no Firebase SDK dependency and no
  implementation** — it's a placeholder. Real providers: `mock`, `rest`, `supabase`.
- **The `rest` provider** exists in every `*Api.ts` but points at
  `VITE_API_BASE_URL` (default `localhost:3000`); there is no REST backend in this
  repo. It is a development/abstraction seam, not a deployed backend.
- **No image-optimization pipeline**; images are served as uploaded (webp covers,
  png logos) through the Pages proxy.

See [adr/](adr/README.md) for the reasoning behind the major choices.
