# Repository structure

```text
apps/
  landing/       production website and /portal/* student routes
  portal/        student source/local workspace
  admin/         separate production Admin Panel
packages/
  api/ auth/ config/ constants/ types/ ui/
src/             shared application source consumed by the app shells
supabase/
  schema.sql     baseline schema reference
  migrations/    current migration files
  functions/     Supabase Edge Functions
functions/       root Pages Functions copy for public R2 proxying
public/          shared static assets
docs/            canonical documentation and retained references
```

The app Vite configurations alias `@` to the root `src/` directory. The root
`src/` tree is a shared library, not a separate runnable application.

The current migration and Edge Function inventories are intentionally obtained
from their directories rather than fixed counts. See [Current architecture](architecture/current.md),
[Edge Functions](edge-functions.md), and [Migration operations](database/migrations.md).
