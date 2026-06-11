# ADR 0006 — RLS (+ Edge Functions) as the security boundary

**Status:** Accepted · **Evidence:** `supabase/schema.sql` + migrations (RLS
policies, `is_admin`, `is_active_subscriber`), `get-signed-urls`,
`config.toml` (`verify_jwt=false` note), in-code comments throughout.

## Context
It's a paywalled product on a client-side SPA. The browser is fully untrusted —
route guards and tier checks can be bypassed. Access control had to live somewhere
the client can't reach.

## Decision
Make **Postgres Row-Level Security the authoritative authorization boundary**, with
**Edge Functions** as the second privileged layer:
- Every user/premium table has RLS enabled; policies use SECURITY DEFINER helpers
  (`is_admin` from `app_metadata`, `is_active_subscriber`).
- The **admin role** is server-set in `app_metadata` (client can't change it).
- **Money/devices/orders writes have no client policy** — only service-role Edge
  Functions mutate them.
- **Frontend guards/tier checks are explicitly UX-only**, repeated server-side.
- Premium media access is decided by the `get-signed-urls` Edge Function, not the
  client (see [0008](0008-signed-url-content-protection.md)).

## Alternatives considered (inferred)
- **Enforce access in the React app / a thin API** — rejected: bypassable; a
  determined user hits PostgREST/Edge Functions directly. The litmus test the team
  adopted is "does an unsubscribed user calling the DB/Edge Function directly get
  blocked?"

## Consequences
- ✅ Access rules are centralized at the data layer and apply to every client path.
- ✅ Strong default: even a malicious direct PostgREST call is governed by policy.
- ✅ The riskiest writes (payments, orders, devices, subscriptions activation) are
  service-role-only.
- ⚠️ **RLS is intricate** and must evolve carefully (e.g. the Day-1 → free-preview
  swap touched multiple policies).
- ⚠️ **A legacy gap remains:** `subscriptions` still has client `insert/update own`
  policies — a known high-priority fix ([../security.md](../security.md) #1).
- ⚠️ Quiz scores are inserted by the client (RLS checks who/where, not the value).
- ⚠️ Two deliberate advisor exceptions exist (`lesson_previews` invoker;
  `get-signed-urls` `verify_jwt=false`) — documented and bounded.
