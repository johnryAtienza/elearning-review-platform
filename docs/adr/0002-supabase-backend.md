# ADR 0002 — Supabase as the backend

**Status:** Accepted · **Evidence:** `supabase/` (schema, 30 migrations, 11 Edge
Functions, `config.toml`), `@s-class/api/supabaseClient.ts`,
`@s-class/auth/authStore.ts`.

## Context
A small team needed Postgres, authentication, fine-grained authorization, and
server-side logic for secrets — without operating servers. Time-to-market and low
ops cost mattered more than backend flexibility.

## Decision
Use **Supabase** for everything backend:
- **Postgres** as the database (schema + numbered migrations).
- **Supabase Auth** (email/password, JWT sessions) with the admin role in
  `app_metadata`.
- **Row-Level Security** as the authorization boundary (helper functions
  `is_admin`, `is_active_subscriber`, `get_user_tier`).
- **Edge Functions (Deno)** for privileged logic and secret handling (payments,
  signed URLs, device limits, uploads).
- The browser talks to data via **PostgREST** (anon key + user JWT) and invokes
  Edge Functions; no custom API server.

## Alternatives considered (inferred)
- **Custom Node/Express API** — rejected: ops + auth + RLS would be hand-built. A
  `rest` provider seam exists in code but no such backend is deployed.
- **Firebase** — left as a *stub* provider option (`VITE_AUTH_PROVIDER=firebase`)
  but never implemented; Postgres + RLS were preferred over Firestore.

## Consequences
- ✅ One managed service for DB + auth + authz + serverless; fast to build.
- ✅ RLS centralizes access rules at the data layer (strong default security).
- ✅ Edge Functions keep R2/PayMongo secrets off the client.
- ⚠️ **Vendor coupling** to Supabase conventions (RLS, `app_metadata`, PostgREST).
- ⚠️ **One project shared across environments** (prod data in previews) — a known
  risk; see [../environments.md](../environments.md).
- ⚠️ **Schema drift** crept in (some objects created in the dashboard, not
  migrations) — see [../database/tables.md](../database/tables.md).
- ⚠️ Edge Functions bypass RLS (service role) and must re-implement authz in code.
