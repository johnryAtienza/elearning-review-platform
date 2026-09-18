# Environments

## Local development

| Application | Local address |
|---|---|
| Landing | `http://localhost:5174` |
| Portal workspace | `http://localhost:5175` |
| Admin | `http://localhost:5176` |

## Production topology

- Landing Pages project: `s-class-landing`, production website and `/portal/*`.
- Admin Pages project: `s-class-admin`, separate Admin application.
- Portal: no independent production Pages deployment.

Preview environments may share Supabase and R2 resources with production.
Confirm the project and data target before writes or migrations.

See [deployment.md](deployment.md), [local development](architecture/local-development.md),
and [known gaps](known-gaps.md).
