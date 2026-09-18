# Database functions

The database functions support RLS, entitlement checks, dashboard aggregates,
quiz history, and atomic book operations. The current source and migration set
are authoritative; this page avoids treating retired Edge Functions as active
callers.

Important helpers include:

- `is_admin`
- `is_active_subscriber`
- `get_user_tier`
- `subscription_days_remaining`
- `extend_subscription`
- `decrement_book_stock`
- `restock_book`
- `get_saved_subjects_progress`
- `get_dashboard_stats`
- `get_quiz_history`

`extend_subscription` is invoked by the payment verification and Admin
subscription workflows, not by a client directly. The disabled `subscribe`
compatibility endpoint is documented in [Edge Functions](../edge-functions.md).

See [RPCs](rpcs.md), [RLS policies](rls-policies.md), and
[effective schema](effective-schema.md).
