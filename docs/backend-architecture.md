# Backend architecture pointer

The maintained backend documentation is split into:

- [Access control](access-control.md)
- [Payments](payments.md)
- [Storage](storage.md)
- [Edge Functions](edge-functions.md)
- [Effective schema](database/effective-schema.md)
- [Migration operations](database/migrations.md)

The backend is Supabase Auth/PostgreSQL/RLS plus Supabase Edge Functions,
Cloudflare R2, Cloudflare Pages Functions, and PayMongo. Service-role functions
must perform their own authorization because service-role access bypasses RLS.
