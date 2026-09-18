# Domain: memberships and subscriptions

Standard access is an entitlement derived from an active, non-expired
subscription. PayMongo payment history and subscription entitlement are stored
and processed separately.

## Student purchase path

The student selects a duration, completes PayMongo checkout, and returns to
S-Class for verification. `verify-payment` and `paymongo-webhook` update payment
history and entitlement through the server-side subscription logic.

## Admin path

Admins can manually assign or manage Standard access through the Admin Panel.
Manual assignment is an administrative entitlement action; it does not create a
PayMongo payment.

## Access rules

Free Preview is per lesson. Active Standard access unlocks premium content that
the lesson and subscription rules permit. See [Access control](../access-control.md)
and [Payments](../payments.md).

The former direct `subscribe` function is disabled and returns HTTP 410. It is
not an active purchase path.
