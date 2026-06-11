# ADR 0003 — Cloudflare Pages hosting + R2 storage

**Status:** Accepted · **Evidence:** `CLOUDFLARE_PAGES.md`, `apps/*/public/_redirects`,
`functions/` + `apps/*/functions/` (Pages Functions), `get-signed-urls`,
`storageClient.ts`, R2 env vars in `.env.example`.

## Context
The platform serves large premium media (videos, reviewer PDFs) plus public images
(thumbnails, covers, avatars), needs cheap global delivery, SPA hosting, and must
keep premium media private. The team already used Cloudflare for DNS.

## Decision
- **Host the SPAs on Cloudflare Pages** (static + colocated Pages Functions), with
  SPA routing via `_redirects`.
- **Store all media in Cloudflare R2** (S3-compatible), accessed server-side with
  `@aws-sdk/client-s3` + presigner.
- **Premium media** is delivered only as **60 s presigned GET URLs** from the
  `get-signed-urls` Edge Function (never public).
- **Public images** are proxied through **Pages Functions** that allow-list
  prefixes (`thumbnails/ avatars/ quizzes/ covers/`) and add cache headers
  (`max-age=86400, s-maxage=604800`).

## Alternatives considered (inferred)
- **S3 + CloudFront** — the storage abstraction (`storage.service.ts`,
  `STORAGE_BACKEND=s3`) supports it, but Cloudflare was chosen (DNS + Pages + R2 in
  one place, no egress fees).
- **Serving R2's public dev URL directly** — rejected: migrations explicitly
  rewrote those URLs to a Pages-proxied domain to control caching and avoid
  exposing the bucket host.

## Consequences
- ✅ Cheap, global CDN; no egress fees (R2); SPA + Functions colocated.
- ✅ Premium media stays private (signed URLs); public assets are cached hard.
- ✅ Storage backend is swappable (`IStorageProvider`).
- ⚠️ **Pages Functions are duplicated** per app (`functions/` × 3) — consolidation
  to `cdn.s-class.com.ph` is deferred.
- ⚠️ The `_redirects` SPA rule needs the `/index.html 200` first line to dodge
  Cloudflare's redirect-loop detector.
- ⚠️ Three Pages projects + custom-domain swaps add deployment ceremony
  (`CLOUDFLARE_PAGES.md`).
