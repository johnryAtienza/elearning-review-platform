# S-Class documentation index

This is the canonical documentation set for the verified repository state.
Implementation, migrations, configuration, and deployment behavior outrank
older documentation. Every document should state whether a feature is current,
pending, retired, or unresolved.

## Client-facing manuals

- [Student User Guide](manuals/s-class-student-user-guide.md)
- [Admin User Manual](manuals/s-class-admin-user-manual.md)

These manuals intentionally exclude repository, database, migration, security,
and unreleased-feature details.

## Developer and operations documentation

- [Current architecture](architecture/current.md)
- [Local development](architecture/local-development.md)
- [Student features](student/features.md)
- [Admin features](admin/features.md)
- [Access control](access-control.md)
- [Payments and subscriptions](payments.md)
- [Storage and media](storage.md)
- [Effective database schema](database/effective-schema.md)
- [Migration operations](database/migrations.md)
- [Edge Functions](edge-functions.md)
- [Deployment](deployment.md)
- [Retired functionality](retired.md)
- [Known gaps](known-gaps.md)
- [Change log](change-log.md)

## Retained reference material

The existing ADRs, business-domain notes, database detail pages, security notes,
and performance notes remain available as supporting references. They do not
override the documents above. Where a reference page conflicts with current
source, it should be corrected or treated as historical.

- [ADRs](adr/README.md)
- [Business domains](business-domains/README.md)
- [Database detail index](database/database-overview.md)
- [Security notes](security.md)
- [Technical debt](technical-debt.md)

## Evidence rule

Use current source code first, current migrations/schema behavior second,
current deployment/configuration third, and this documentation audit fourth.
Existing documentation is evidence only when it still matches the repository.
