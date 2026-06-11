# ADR 0005 — Provider-routed service layer

**Status:** Accepted · **Evidence:** `@s-class/api/*Api.ts` (e.g. `subjectApi.ts`),
`@s-class/config` (`useMock`, `auth.provider`), `data/*` mocks, `apiClient.ts`,
`*.service.ts`.

## Context
The team wanted to develop and demo the UI without a live backend, keep the option
of a different backend, and avoid scattering backend-specific calls through
components.

## Decision
Every data domain exposes a single **`*Api.ts` facade** that fans out to one of
three providers based on env config:

```ts
if (config.api.useMock)                  return MOCK
if (config.auth.provider === 'supabase') return supabaseService.x()
return apiClient.get('/rest/path')       // REST
```

**Components and hooks import the facade, never a provider.** Mock data lives in
`@s-class/api/data/*`; Supabase logic in `*.service.ts`; REST via `apiClient`.
Selected at runtime by `VITE_USE_MOCK` + `VITE_AUTH_PROVIDER`.

## Alternatives considered (inferred)
- **Call Supabase directly from components** — rejected: couples UI to the backend,
  blocks offline/mock dev, and spreads `from('table')` everywhere.
- **A single hardcoded client** — rejected: no swappability for demos/tests.

## Consequences
- ✅ Entire app runs offline (`VITE_USE_MOCK=true`) for dev/demo.
- ✅ Backend is swappable behind a stable interface; UI is backend-agnostic.
- ✅ One obvious place per domain to change data access.
- ⚠️ Boilerplate: each domain needs facade + service + (often) mock.
- ⚠️ The **`rest` provider is unused** (no deployed REST backend) — a maintained
  but dormant branch.
- ⚠️ Three code paths per method can drift if not kept in sync (mock vs real shape).
