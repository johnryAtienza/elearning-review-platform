# ADR 0008 — Signed-URL content protection for premium media

**Status:** Accepted · **Evidence:** `supabase/functions/get-signed-urls/index.ts`,
`lesson_previews` view, `supabase/config.toml`, `secureContent.ts`,
`VideoPlayer.tsx`/`PdfViewer.tsx`, `ContentWatermark.tsx`,
migration `20260605000001_add_lesson_is_free_preview.sql`.

## Context
The paywalled value is the video lessons and reviewer PDFs. If a media URL is
public (or guessable), the paywall is worthless. The team needed media that is (a)
private by default, (b) only reachable after a server-side entitlement check, and
(c) hard to share.

## Decision
Premium media is **never publicly accessible**:
- `lessons.video_url` / `reviewer_pdf_url` store **R2 object keys**, excluded from
  the client-readable `lesson_previews` view and protected by RLS.
- The **only** path from browser to premium R2 is the **`get-signed-urls` Edge
  Function**, which checks `is_free_preview` / admin / active subscription and
  returns **60-second presigned GET URLs**.
- The function runs with `verify_jwt = false` (so anonymous guests can fetch
  *preview* lessons) but **re-authenticates and authorizes in code** via the
  documented access matrix.
- Free access is governed by a per-lesson **`is_free_preview`** flag (replaced the
  earlier `day_number = 1` rule). Public images use a separate allow-listed Pages
  proxy that **never** includes premium prefixes.
- Client-side protections (`ContentWatermark`, DevTools-shortcut blocking,
  screen-record heuristics, free-tier caps) are **deterrents only**.

## Alternatives considered (inferred)
- **Public R2 URLs / long-lived links** — rejected: trivially shareable; no
  entitlement check.
- **Column-level grants on `lessons`** — rejected: harder to keep correct as the
  schema evolves than redacting via the view's SELECT list.
- **Client-only gating** — rejected: bypassable (the whole point of [0006](0006-rls-security-boundary.md)).

## Consequences
- ✅ Premium media is private and only served after a server entitlement check.
- ✅ 60 s TTL sharply limits URL sharing.
- ✅ Guests can sample flagged previews (drives conversion) without exposing premium.
- ⚠️ `verify_jwt = false` on this one function is a deliberate exception — **do not
  copy it** to functions lacking equivalent in-code authz (`config.toml` warns).
- ⚠️ `lesson_previews` runs `security_invoker = false` (re-triggers an advisor
  warning) — accepted because its SELECT list excludes premium columns. Adding a
  premium column there would leak media.
- ⚠️ A 60 s window can still be screen-recorded — DRM-grade protection is out of
  scope; client deterrents are explicitly weak.
