# Database overview pointer

The maintained database documentation is:

- [Effective schema](effective-schema.md)
- [Migration operations](migrations.md)
- [Tables](tables.md)
- [Views](views.md)
- [RPCs](rpcs.md)
- [RLS policies](rls-policies.md)

The effective schema includes historical out-of-band objects and cannot be
recreated reliably from `supabase/schema.sql` plus migrations alone. Do not use a
hardcoded migration count as a schema guarantee.
