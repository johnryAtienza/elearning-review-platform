# Current architecture

## Runtime topology

```text
Landing
  ├─ production marketing website
  └─ production /portal/* student experience

Portal workspace
  ├─ shared student source and local development
  └─ not independently deployed to production

Admin
  └─ separate production Admin application

Backend
  ├─ Supabase Auth
  ├─ Supabase PostgreSQL and RLS
  ├─ Supabase Edge Functions
  └─ Cloudflare R2
```

Production uses two Cloudflare Pages applications: Landing and Admin. Student
routes are same-origin below `/portal`, which keeps browser sessions on the
Landing origin. Portal remains useful for isolated local testing and source
reuse, but it is not a third production deployment.

## Repository layers

| Layer | Location | Responsibility |
|---|---|---|
| Application shells | `apps/landing`, `apps/portal`, `apps/admin` | Vite entry points and routers |
| Shared application source | `src/` | Student pages, layouts, feature components, and hooks shared by app shells |
| API facade | `packages/api` | Browser-safe services and provider routing |
| Auth | `packages/auth` | Session, subscription, device, and route-guard state |
| Configuration | `packages/config` | Environment-backed runtime configuration |
| Types/constants/UI | `packages/types`, `packages/constants`, `packages/ui` | Shared contracts and primitives |
| Backend | `supabase/` | Schema, migrations, RLS, RPCs, views, and Edge Functions |

The Vite app configurations alias `@` to the repository-root `src/` directory.
This is an intentional transitional architecture: shared source remains central
while more ownership gradually moves into packages/apps.

## Request and security boundaries

The browser uses Supabase Auth and the anon key for user-scoped reads and RLS-
protected operations. Privileged actions use Edge Functions. Premium lesson
media and solution PDFs are returned as short-lived signed R2 URLs only after
server-side entitlement checks.

The React route guards are user-experience protections. RLS and server-side
authorization are the actual data and content boundaries. See
[Access control](../access-control.md) and [Edge Functions](../edge-functions.md).

## Route ownership

- Landing owns marketing, authentication, public preview, books, checkout
  results, and the production `/portal/*` student route tree.
- Portal mirrors the student route tree for local development.
- Admin owns the protected `/admin/*` route tree on its separate origin.
- Legacy student paths remain compatibility redirects into `/portal/*`; they are
  not separate active product experiences.

## Source references

- Landing router: `apps/landing/src/app/router.tsx`
- Portal router: `apps/portal/src/app/router.tsx`
- Admin router: `apps/admin/src/app/router.tsx`
- Shared auth: `packages/auth/src/authStore.ts`
- Runtime config: `packages/config/src/index.ts`
