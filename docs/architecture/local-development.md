# Local development

## Prerequisites

- Node.js version required by the repository and Cloudflare build environment.
- npm with workspace support.
- Supabase CLI only when working on database migrations or Edge Functions.
- Development environment values from `.env.example` and the local environment
  conventions in `packages/config`.

Do not place service-role, PayMongo secret, or R2 secret values in `VITE_*`
variables or client-side code.

## Commands

```text
npm install
npm run dev:landing
npm run dev:portal
npm run dev:admin
npm run type-check
npm run build:landing
npm run build:portal
npm run build:admin
npm run lint
```

Landing uses port 5174, Portal uses port 5175, and Admin uses port 5176 in the
development configuration. The root `npm run dev:all` command starts Landing and
Admin together; Portal is started separately when needed.

## Working conventions

1. Confirm whether a change belongs to an app shell, shared root `src/`, or a
   package before editing it.
2. Treat current source and the effective database behavior as authoritative.
3. Add database changes as a new uniquely timestamped migration. Do not edit an
   already-applied production migration.
4. Run type-check and the affected app build before release.
5. Keep client-side code free of secrets and do not bypass RLS or Edge Function
   authorization for convenience.

## Local data caution

The repository and documented preview environments can point to a shared
Supabase project and R2 bucket. Verify the target project before running any
write, migration, seed, or cleanup operation.
