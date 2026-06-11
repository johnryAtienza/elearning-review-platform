# S Class — Project Knowledge Base

> Generated technical documentation for the **S Class** subscription eLearning
> review platform (repo: `elearning-review-platform`). The audience is a new
> developer who needs to understand the whole system — architecture, business
> flows, database, infrastructure, and conventions — without asking questions.

**Last generated:** 2026-06-11 · **Branch documented:** `develop`

> ⚠️ **Read this first.** This documentation was produced from a source-code
> audit. Where the older root docs (`DOCUMENTATION.md`, `CLAUDE.md`) disagree
> with the code, this knowledge base follows the code and flags the drift. The
> single most important fact: the repo is **mid-migration** from a single-SPA
> (`src/*`) into a **three-app monorepo** (`apps/landing`, `apps/portal`,
> `apps/admin`) plus shared `packages/*`. There is **no longer a runnable
> "legacy root app"** — `src/*` is now a shared source library consumed by the
> three apps via the `@/` alias.

---

## How to read this knowledge base

| If you want to… | Start here |
|---|---|
| Understand what the product is | [overview.md](overview.md) |
| Know what's in the stack and why | [tech-stack.md](tech-stack.md) |
| Find your way around the folders | [repository-structure.md](repository-structure.md) |
| Work on the React apps | [frontend-architecture.md](frontend-architecture.md) |
| Work on Supabase / Edge Functions | [backend-architecture.md](backend-architecture.md) |
| Understand the data model | [database/](database/database-overview.md) |
| Understand a feature end-to-end | [business-domains/](business-domains/README.md) |
| Deploy or configure environments | [environments.md](environments.md) · [developer-guide.md](developer-guide.md) |
| Review security posture | [security.md](security.md) |
| Improve performance | [performance.md](performance.md) |
| Understand *why* decisions were made | [adr/](adr/README.md) |
| See risks and clean-up backlog | [technical-debt.md](technical-debt.md) · [recommendations.md](recommendations.md) |
| Prime an AI assistant | [ai-context.md](ai-context.md) |
| See module/route/dependency maps | [system-map.md](system-map.md) |

## Full index

### Core
- [overview.md](overview.md) — purpose, goals, users, architecture, status
- [tech-stack.md](tech-stack.md) — every technology, why, where, how
- [repository-structure.md](repository-structure.md) — folder map + ownership
- [frontend-architecture.md](frontend-architecture.md) — routing, state, data flow, design system
- [backend-architecture.md](backend-architecture.md) — APIs, RPCs, Edge Functions, authz
- [environments.md](environments.md) — dev/staging/prod, env vars, release flow
- [security.md](security.md) — auth, RLS, content protection, risks
- [performance.md](performance.md) — bundles, queries, rendering, caching
- [developer-guide.md](developer-guide.md) — setup, commands, workflow, troubleshooting
- [ai-context.md](ai-context.md) — condensed context for AI assistants
- [technical-debt.md](technical-debt.md) — dead/duplicated code, risks (ranked)
- [recommendations.md](recommendations.md) — ranked improvement backlog
- [system-map.md](system-map.md) — dependency / route / RPC maps

### Database (`docs/database/`)
- [database-overview.md](database/database-overview.md) — ERD + summary
- [tables.md](database/tables.md) · [relationships.md](database/relationships.md) · [indexes.md](database/indexes.md)
- [constraints.md](database/constraints.md) · [triggers.md](database/triggers.md) · [views.md](database/views.md)
- [functions.md](database/functions.md) · [rpcs.md](database/rpcs.md) · [rls-policies.md](database/rls-policies.md)

### Business domains (`docs/business-domains/`)
- [README.md](business-domains/README.md) — domain index + map
- [users.md](business-domains/users.md) · [courses-subjects.md](business-domains/courses-subjects.md) · [lessons.md](business-domains/lessons.md)
- [quizzes.md](business-domains/quizzes.md) · [memberships.md](business-domains/memberships.md) · [books.md](business-domains/books.md)
- [devices.md](business-domains/devices.md) · [homepage-cms.md](business-domains/homepage-cms.md) · [analytics.md](business-domains/analytics.md)

### Architecture Decision Records (`docs/adr/`)
- [README.md](adr/README.md) — ADR index

## Conventions used in this knowledge base

- **Evidence-based.** Claims cite real files/paths. Where something could not be
  determined from the code, it is called out as an *assumption*.
- **Vocabulary.** The product domain is **Course → Subject → Lesson + Quiz**.
  Be aware that the database tables were *renamed* into this vocabulary while the
  **URL strings were intentionally left legacy** (`/courses` lists Subjects,
  `/admin/categories` manages parent Courses). See
  [adr/0007-course-subject-rename.md](adr/0007-course-subject-rename.md).
- **Diagrams** are Mermaid so they render on GitHub.
