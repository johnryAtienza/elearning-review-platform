# ADR 0001 — React 19 + Vite SPA in TypeScript

**Status:** Accepted · **Evidence:** `package.json`, every `apps/*` and `src/*`,
`vite.config.ts`, `tsconfig.app.json`.

## Context
The product is a content-and-interaction-heavy app (video player, PDF viewer,
quizzes, dashboards, admin CRUD) for a single-page, app-like experience. The team
needed fast iteration, a large component ecosystem, and no server to run.

## Decision
Build the frontend as **client-side SPAs with React 19 + TypeScript, bundled by
Vite 8**, styled with **Tailwind v4**, routed with **react-router-dom 7**
(`createBrowserRouter`), state in **Zustand**. No SSR/Next.js. `strict` TS with
`noUnusedLocals/Parameters`; the build fails on any type error.

## Alternatives considered (inferred)
- **Next.js / SSR** — rejected: adds a server runtime and complexity; SEO needs are
  limited to the marketing surface (a separate SSG migration is a *postponed*
  consideration, not adopted).
- **CRA / Webpack** — rejected: Vite's dev speed + simpler config.
- **Redux / MobX** — rejected: Zustand's minimal hook API fits the modest global
  state (auth, saved subjects, quiz).

## Consequences
- ✅ Fast dev/build; small mental overhead; huge ecosystem (react-pdf, KaTeX, sonner).
- ✅ Type safety end-to-end via shared `@s-class/types`.
- ⚠️ **SPA SEO limits** on the marketing site (client-rendered). A Vite→SSG plan
  was drafted and **postponed**.
- ⚠️ Client bundles carry heavy deps (PDF/KaTeX/AWS SDK) — see
  [../performance.md](../performance.md).
- ⚠️ All access control must be enforced server-side (the client is untrusted) —
  see [0006](0006-rls-security-boundary.md).
