# Architecture Decision Records

These ADRs are **reconstructed from the codebase** (commit history, in-code
comments, migration headers, and structure) — the project did not keep formal
ADRs, so these document the decisions as evidenced by the code. Each notes its
evidence. Format: Context · Decision · Consequences · Status.

| # | Decision | Status |
|---|---|---|
| [0001](0001-react-spa.md) | React 19 + Vite SPA (TypeScript) | Accepted |
| [0002](0002-supabase-backend.md) | Supabase as the backend (Postgres + Auth + RLS + Edge Functions) | Accepted |
| [0003](0003-cloudflare-pages-r2.md) | Cloudflare Pages hosting + R2 storage | Accepted |
| [0004](0004-monorepo-subdomain-split.md) | Monorepo split into three subdomain apps + shared packages | Partially superseded for student routing |
| [0005](0005-provider-routed-service-layer.md) | Provider-routed service layer (mock/REST/Supabase) | Accepted |
| [0006](0006-rls-security-boundary.md) | RLS (+ Edge Functions) as the security boundary | Accepted |
| [0007](0007-course-subject-rename.md) | Rename to Course→Subject hierarchy, keep legacy URLs | Accepted |
| [0008](0008-signed-url-content-protection.md) | Signed-URL content protection for premium media | Accepted |

## Writing new ADRs
When you make a significant architectural decision, add `NNNN-title.md` here and a
row above. Keep it short: the *why*, the alternatives rejected, and the
consequences (including the debt you're accepting).
