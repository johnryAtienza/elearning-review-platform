# S-Class protected video architecture

## Repository audit

The current production flow is a legacy MP4 flow, not DRM:

| Concern | Current implementation | Finding |
| --- | --- | --- |
| Admin upload | `apps/admin/src/features/admin/components/LessonModal.tsx` → `packages/api/src/storageClient.ts` → `supabase/functions/generate-upload-url/index.ts` | The browser uploads a source video directly to R2 using an admin-authenticated presigned PUT URL. The object key is stored after upload. |
| Lesson metadata | `public.lessons.video_url`, `reviewer_pdf_url`, `is_free_preview`, curriculum fields; accessed through `packages/api/src/admin.service.ts` and `packages/api/src/lesson.service.ts` | `video_url` is an R2 object key such as `videos/lessons/lesson-<id>.mp4`. Student-safe `lesson_previews` excludes premium media fields. |
| Storage URLs | `supabase/functions/get-signed-urls/index.ts` | The function signs R2 GET URLs for 60 seconds after access checks. This is access control, not content encryption or DRM. |
| Student player | `src/features/lessons/components/VideoPlayer.tsx` | Native HTML5 `<video>` plays the signed MP4. The browser receives the media bytes and can request them during the URL lifetime. |
| Student content fetch | `src/features/lessons/hooks/useSecureContent.ts` and `packages/api/src/secureContent.ts` | The new path now calls `get-playback-session`; legacy lessons still receive a short-lived MP4 URL. |
| Auth and entitlement | `packages/auth/src/authStore.ts`, `packages/api/src/subscriptionApi.ts`, and the server-side subscription query in the Edge Functions | Active subscription is determined by `subscriptions.is_active` plus `expires_at`; admin is identified from auth app metadata. |
| Free previews | `lessons.is_free_preview`, `packages/api/src/accessControl.ts`, and the access matrix in `get-signed-urls` | Preview lessons can be played without a subscription. Migrated DRM previews require sign-in because license-session issuance is authenticated by design. Legacy previews remain guest-compatible during migration. |
| Progress/completion | `src/pages/LessonPage.tsx`, `packages/api/src/lessonProgressApi.ts`, and `lesson_progress` | Playback reports time, but a lesson is not marked watched merely by starting a session. The existing explicit “Mark as Watched” action remains the completion write. |
| Sequential locking | `src/features/subjects/components/curriculum.tsx` and `src/pages/LessonPage.tsx` | Unlock decisions use `lesson_progress.is_watched`; the DRM player preserves the same progress callbacks and lesson navigation behavior. |
| Device limits | `packages/api/src/devicesApi.ts`, `supabase/functions/register-device/index.ts`, `revoke-device`, `admin-devices`, and `user_devices` | Device registration remains the existing login boundary. The playback session is user-scoped; a future provider/broker can add concurrent-license enforcement without changing the player. |
| Deployment/secrets | `supabase/functions/*`, `supabase/config.toml`, Cloudflare Pages apps, and the root environment configuration | Supabase Edge Functions are the server boundary. R2 and DRM broker secrets must be Supabase secrets, never `VITE_*` variables. |

There is no existing HLS/DASH packaging, encryption key service, Widevine/FairPlay license integration, or DRM-capable player. The old `useContentProtection` and `useScreenRecordingDetection` hooks were heuristics only; they are no longer invoked by `LessonPage` and are not part of the DRM boundary.

## Threat model

Access control and content protection are separate layers:

- Access control: authenticated Edge Functions, published-lesson checks, preview/subscription entitlement, short-lived legacy URLs, origin policy, and device/account controls limit who can request playback.
- Content protection: encrypted DASH/HLS plus Widevine/FairPlay license issuance lets the platform CDM handle decryption on supported devices. The browser receives a short-lived session configuration, not encryption keys or provider credentials.
- Limitations: DRM can block or black out many software-based capture paths on supported devices, but it is not universal. Browser/OS/CDM behavior varies, protected playback can fail on unsupported configurations, and no web DRM prevents someone from filming the display with another physical camera. S-Class must not market this as making piracy impossible.

Right-click blocking, shortcut interception, DevTools detection, transparent overlays, focus-loss pausing, extension detection, and CSS/JavaScript screenshot tricks are not DRM and are not relied on here. Native controls remain available.

## Architecture decision

### Option A — managed multi-DRM video platform

The vendor handles ingest/transcoding, encrypted DASH/HLS packaging, Widevine/FairPlay licensing, and usually playback-token issuance.

This is the lowest operational risk and gives the best device-compatibility path, but it introduces recurring usage/storage/encoding/license costs, provider-specific admin workflows, and stronger vendor lock-in. It can preserve current progress behavior because the lesson ID remains the application key and only the playback asset changes.

### Option B — existing R2/CDN plus external multi-DRM

R2 remains the source/legacy store while an external multi-DRM pipeline packages encrypted DASH/HLS assets. S-Class authorizes a user/lesson/asset session through a server-side broker, and the player receives short-lived manifest/license information.

This is the recommended starting point. It preserves the current Supabase/R2 data model and Admin upload concepts, allows coexistence and per-lesson rollout, and avoids exposing provider credentials. The cost is a real ingest/processing pipeline plus provider integration work, and the selected provider may still impose lock-in. R2 must not be treated as the DRM license service.

### Option C — fully self-managed packaging and licensing

S-Class would operate packagers, key servers, Widevine/PlayReady/FairPlay contracts and certificates, license policies, origin protection, rotation/revocation, monitoring, and compatibility testing. FairPlay certificate management and Apple platform behavior add separate operational requirements.

This has the greatest security and maintenance burden and is not recommended for the current repository. It is only justified if S-Class already has a video-security team and a strong regulatory or scale reason to own the complete DRM stack.

### Recommendation

Use Option B with a managed multi-DRM provider behind a S-Class-owned `DRM_SESSION_BROKER_URL`. The broker is the vendor adapter: it receives a server-to-server request containing the authenticated user, lesson, provider, and asset ID, then returns the provider-specific short-lived manifest/license session. The browser contract remains stable if the vendor changes.

The provider is intentionally not selected in code. Before production activation, decide:

1. Which vendor supports Widevine and FairPlay for S-Class’s target browsers/devices, and whether PlayReady is needed for Windows/Edge requirements.
2. Whether the vendor supplies encrypted manifests/segments, signed playback URLs, a license token, a FairPlay certificate URL, and any provider-specific SPC/CKC request/response transforms.
3. The exact broker request/response contract and token TTL. The current function requires HTTPS URLs, a short-lived license token, at least one manifest, at least one license server, and an expiry no more than 15 minutes ahead.
4. Whether the provider can enforce concurrent sessions/device limits and how that maps to `user_devices`.
5. Allowed video/CDN origins, CORS, referrer/origin policy, watermark policy, retention, takedown, and regional licensing requirements.
6. Packaging/codec choices that work on both browser families: DASH/CENC for Chromium/Firefox and HLS/CBCS/FairPlay for Safari/Apple platforms.

Shaka Player is used because it supports adaptive DASH/HLS and EME-based DRM integration; provider-specific FairPlay transforms still require validation against the selected vendor.

## Implemented integration boundary

The following files establish the vendor-neutral path:

- `supabase/migrations/20260805000001_add_lesson_drm_metadata.sql` adds provider/asset/status/manifest/error metadata without deleting `video_url`.
- `supabase/functions/get-playback-session/index.ts` is the authoritative access gate. It verifies the JWT, published subject, preview/subscription/admin access, lesson-owned DRM asset metadata, and short-lived broker response. It returns no provider secret.
- `packages/api/src/secureContent.ts` and `src/features/lessons/hooks/useSecureContent.ts` consume the new session response while keeping the old API name for callers during migration.
- `src/features/lessons/components/VideoPlayer.tsx` uses Shaka for `mode: 'drm'` and retains the existing native player for `mode: 'legacy'`. It preserves ended/progress/resume callbacks and destroys the player/filter on lesson changes and unmount.
- `apps/landing/package.json` and `apps/portal/package.json` add `shaka-player@4.16.0`.
- `supabase/functions/generate-upload-url/index.ts` now requires an admin role and allows only known admin asset prefixes. DRM source ingest should eventually move to a provider-specific server-side ingest job; this upload function must not be treated as a packaging service.

The session broker contract is deliberately generic:

```json
{
  "manifestUrl": "https://provider.example/short-lived/manifest",
  "dashManifestUrl": "https://provider.example/short-lived/stream.mpd",
  "hlsManifestUrl": "https://provider.example/short-lived/stream.m3u8",
  "licenseServers": {
    "widevine": "https://provider.example/license/widevine",
    "fairplay": "https://provider.example/license/fairplay",
    "playready": "https://provider.example/license/playready"
  },
  "licenseToken": "short-lived-provider-token",
  "fairPlayCertificateUrl": "https://provider.example/short-lived/fairplay.cer",
  "sessionId": "provider-session-reference",
  "expiresAt": "2026-08-05T10:00:00Z"
}
```

The example is an interface shape only; it is not a provider API or credential. `DRM_SESSION_BROKER_TOKEN` is a Supabase secret. `DRM_SESSION_BROKER_URL` and `CORS_ALLOWED_ORIGINS` are deployment configuration, not browser variables.

## Safe migration and rollout

1. Inventory every `lessons.video_url` object key, source codec/container, duration, size, and whether the lesson is preview/premium.
2. Select the provider and implement the server-side broker adapter. Do not put provider API keys, signing keys, or FairPlay private material in React or `VITE_*` variables.
3. Ingest each source into the protected pipeline. Set the lesson status to `pending` or `processing`, retain `video_url`, and keep `drm_enabled=false`.
4. Transcode/package/encrypt the asset and store only the provider asset ID and non-secret operational metadata in `lessons`.
5. Validate a real Widevine path on supported Chrome/Firefox/Android devices and a real FairPlay path on Safari/iOS/macOS. Test PlayReady only if it is a required target.
6. Mark `drm_processing_status='ready'` only after manifest, license, expiry, CORS/origin, seeking, resume, and mobile tests pass.
7. Enable `drm_enabled=true` for one controlled lesson using the admin service/migration tooling. The new endpoint fails closed if metadata is incomplete or the broker is unavailable.
8. Monitor license errors, authorization failures, playback startup, completion/progress, and device concurrency without logging tokens, license payloads, or provider responses.
9. Roll out lesson-by-lesson. Keep the legacy MP4 path available for rollback, but do not advertise it as DRM-protected after a rollback.
10. Retire legacy direct playback only after the required browser/device matrix and all migrated assets are verified. Remove source access through a separate, reviewed retention/deletion operation.

The existing watched threshold and sequential locking remain unchanged: creating a playback session never writes `lesson_progress`; only the existing completion action does.

## Optional forensic watermark

The existing `ContentWatermark` remains an optional deterrent. It can show a masked email/account reference and moves periodically. It is not DRM, does not prevent capture, and should remain controlled by `VITE_PROTECTION_WATERMARK` (or a future dedicated DRM watermark flag). Avoid displaying a full email or unnecessary personal data.

## Required production configuration

Set these in Supabase Edge Function secrets/configuration for each deployment environment:

- `DRM_SESSION_BROKER_URL`
- `DRM_SESSION_BROKER_TOKEN`
- `CORS_ALLOWED_ORIGINS` with the exact Landing/Portal origins
- Existing `SUPABASE_*` and R2 secrets used for legacy PDFs/MP4s during coexistence

No DRM secret belongs in the landing or portal `.env` files. A DRM-enabled lesson will intentionally return a controlled configuration error until the broker and provider asset are configured.
