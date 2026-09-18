# Payments and subscriptions

## Two separate concepts

### Payment history

Payment history records an attempted or completed PayMongo transaction. It is
used for idempotency, verification, and operational reconciliation.

### Subscription entitlement

Subscription entitlement is the access state that determines whether a student
can use Standard content. It is represented by the subscription record, tier,
active state, and expiry. A payment record and an active entitlement are related
but are not the same record or concept.

## Student subscription flow

1. The student chooses a duration in the Subscription page.
2. `create-checkout` creates a PayMongo checkout session.
3. PayMongo processes the payment.
4. PayMongo redirects the student back to the payment-success route.
5. `verify-payment` verifies the session, checks ownership and payment state,
   records the payment idempotently, and extends the subscription.
6. `paymongo-webhook` provides a server-to-server confirmation path if the
   student closes the browser before verification.

The server-side payment and pricing checks are authoritative.

## Admin manual assignment

Admins can assign or modify Standard access through the Admin Panel. This path
uses the admin subscription workflow and records an audit reason. It does not
create a PayMongo checkout or represent an online payment.

Admin actions include manual assignment, renew, extend, activate, deactivate,
and custom expiry where the current subscription state permits the action.

## Book payments

Book checkout uses separate book checkout, verification, and webhook functions.
Book stock is controlled during checkout and orders are retained for fulfillment.
Book ownership can affect access to associated lesson solution PDFs.

## Retired compatibility path

The `subscribe` Edge Function is disabled and returns HTTP 410. It must not be
documented or used as an active student payment flow. Use PayMongo checkout and
verification, or the documented Admin workflow.

References:

- `supabase/functions/create-checkout`
- `supabase/functions/verify-payment`
- `supabase/functions/paymongo-webhook`
- `supabase/functions/admin-subscriptions`
- `packages/api/src/subscriptionApi.ts`
