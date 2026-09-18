# Edge Functions

The current function inventory is the directory contents of
`supabase/functions/`. The functions below are grouped by purpose.

## Admin

- `admin-users` — authorized user creation, profile administration, and admin-
  triggered password reset.
- `admin-subscriptions` — audited subscription assignment and state changes.
- `admin-devices` — authorized device administration/reset.

## Authentication and device access

- `register-device` — register or touch an authenticated user's device and apply
  the configured device rules.
- `revoke-device` — deactivate an authenticated user's device.

## Storage and content

- `generate-upload-url` — authorize Admin uploads and generate presigned R2 PUT
  URLs.
- `get-signed-urls` — authoritative lesson video/PDF access check and short-lived
  signed R2 GET URL generation. Gateway JWT verification is disabled to support
  public preview requests; authorization is performed inside the function.

## Subscription payment

- `create-checkout` — create a PayMongo subscription checkout session.
- `verify-payment` — verify a PayMongo subscription checkout and update payment
  and entitlement state idempotently.
- `paymongo-webhook` — server-to-server subscription payment confirmation.

## Book payment

- `create-book-checkout` — create a book checkout and handle stock reservation.
- `verify-book-payment` — verify a book payment and update the order.
- `book-paymongo-webhook` — server-to-server book payment confirmation.

## Retired/compatibility

- `subscribe` — disabled compatibility endpoint. It returns HTTP 410 and is not
  an active subscription flow. Student subscriptions use PayMongo checkout,
  verification, and webhooks; Admin access changes use `admin-subscriptions`.

## Operational notes

Functions that use service-role credentials must repeat authorization checks in
their own code because service-role access bypasses RLS. Secrets belong in the
Supabase/Edge Function environment, never in client-exposed `VITE_*` variables.
