# Access control

## Identity

Supabase Auth provides email/password accounts and JWT sessions. Admin status is
derived from the server-controlled application metadata role. Client route guards
improve navigation but are not the security boundary.

## Entitlements

| State | General access |
|---|---|
| Guest | Public pages and lessons marked Free Preview |
| Free account | Free Preview content and account-owned features |
| Active Standard | Premium lesson content allowed by subscription rules |
| Admin | Administrative access and content access for operational purposes |

An active subscription is determined by the subscription record and expiry, not
by a browser-controlled flag. The client persists only a convenience summary and
re-synchronizes the entitlement from the backend.

## Lesson access

Lesson metadata is exposed through the redacted lesson-preview view so public
curriculum pages can render safely. Premium video and solution assets are
obtained from `get-signed-urls`, which checks the user, lesson publication,
Free Preview status, subscription tier, and relevant book entitlement before
returning short-lived R2 URLs.

Sequential curriculum rules can keep a later lesson locked until earlier lessons
are watched or completed. A locked card or client-side route cannot grant access
by itself.

## Free Preview

Free Preview is an explicit per-lesson flag. It is available to guests where the
published preview path permits it and does not grant unrelated premium content.

## Device access

The platform has device registration and revoke flows for the configured device
limit. The device-limit feature is configuration-controlled and currently
disabled by default unless enabled in the runtime environment.

## Enforcement references

- Client state and guards: `packages/auth/src/authStore.ts`
- Lesson access: `supabase/functions/get-signed-urls/index.ts`
- Upload authorization: `supabase/functions/generate-upload-url/index.ts`
- Database policies: `supabase/migrations` and `docs/database/rls-policies.md`
