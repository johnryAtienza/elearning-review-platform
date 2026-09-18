# Deployment

## Production applications

| Application | Pages project | Output | Production role |
|---|---|---|---|
| Landing | `s-class-landing` | `apps/landing/dist` | Marketing site and `/portal/*` student experience |
| Admin | `s-class-admin` | `apps/admin/dist` | Separate Admin Panel |

The Portal Pages deployment is retired. `apps/portal` remains a source/local
workspace and is not independently deployed to production.

## Backend deployment

- Supabase hosts Auth, PostgreSQL, RLS, views, RPCs, and Edge Functions.
- Cloudflare R2 stores object media.
- Pages Functions proxy approved public R2 asset prefixes.
- PayMongo is used by the payment Edge Functions.

## Release cautions

- Confirm the target Supabase project and R2 environment before making changes.
- Resolve migration-history differences before any `supabase db push`.
- Do not deploy code that queries a schema field before the matching migration
  is applied and verified.
- Preview/staging environments may share production Supabase and R2 resources;
  treat them as production data unless the environment has been explicitly
  isolated.
- Keep service-role, R2, and PayMongo secrets out of Pages client variables.

## Repository automation

The repository provides per-app build commands and type-checking, but no
repository CI workflow, automated test command, monitoring service, or error
tracker configuration was found. Cloudflare Pages build logs and Supabase/
Cloudflare dashboards are the current operational observability surfaces.

## Source references

- App build scripts: root `package.json`
- Vite app configurations: `apps/*/vite.config.ts`
- Supabase configuration: `supabase/config.toml`
- Environment conventions: `packages/config/src/index.ts`, `.env.example`
