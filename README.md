# S-Class

S-Class is a subscription-based eLearning review platform. The repository is
an npm-workspaces monorepo containing the production Landing site, the student
portal source workspace, the Admin Panel, shared packages, and Supabase/R2
backend resources.

## Start with the documentation index

The verified documentation set is indexed in [docs/README.md](docs/README.md).
It distinguishes released, pending, retired, and unresolved functionality.

Client-facing instructions are separate:

- [Student User Guide](docs/manuals/s-class-student-user-guide.md)
- [Admin User Manual](docs/manuals/s-class-admin-user-manual.md)

Developer and operations documentation starts here:

- [Current architecture](docs/architecture/current.md)
- [Local development](docs/architecture/local-development.md)
- [Deployment](docs/deployment.md)
- [Effective database schema](docs/database/effective-schema.md)
- [Migration operations](docs/database/migrations.md)
- [Known gaps](docs/known-gaps.md)

## Workspace commands

```text
npm install
npm run dev:landing   # localhost:5174
npm run dev:portal    # localhost:5175, local portal workspace
npm run dev:admin     # localhost:5176
npm run type-check
npm run build:landing
npm run build:admin
```

The root `src/` directory is shared source consumed by the app shells. It is
not a separate runnable production application.

## Important operational notes

- The production student experience is served by Landing under `/portal/*`.
- Portal is retained for source reuse and isolated local development; it is not
  independently deployed to production.
- Supabase migrations do not fully reproduce the historical production schema.
- The migration ledger currently has a known `20260917000001` collision; see
  [Migration operations](docs/database/migrations.md).
- Lesson Preview Image and Curriculum hover-preview work is committed in the
  current branch but remains pending until its database migration is confirmed
  applied and the feature is released to production.

Do not use the historical root documents as an implementation authority. The
canonical documentation index above is the maintained entry point.
