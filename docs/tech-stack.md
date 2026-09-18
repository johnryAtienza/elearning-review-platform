# Technology stack

This page summarizes the current implementation without hardcoding volatile
migration or function counts.

| Concern | Current implementation |
|---|---|
| Frontend | React, TypeScript, Vite, React Router, Zustand, Tailwind |
| Workspace | npm workspaces with Landing, Portal, Admin, and shared packages |
| Auth | Supabase Auth with email/password and JWT sessions |
| Database | Supabase PostgreSQL with RLS, views, functions, and RPCs |
| Serverless backend | Supabase Edge Functions in `supabase/functions/` |
| Object storage | Cloudflare R2 |
| Payments | PayMongo checkout, verification, and webhooks |
| Hosting | Cloudflare Pages for Landing and Admin |
| Public media proxy | Cloudflare Pages Functions |

Current Edge Functions are documented in [edge-functions.md](edge-functions.md).
Current deployment is documented in [deployment.md](deployment.md). The
effective database model and its reproducibility limitations are documented in
[database/effective-schema.md](database/effective-schema.md).

There is no repository-configured CI workflow, automated test command,
monitoring service, or error tracker.
