-- Allow the existing subscription audit log to distinguish a new manual grant
-- from a renewal of an already-existing subscription.

BEGIN;

ALTER TABLE public.subscription_admin_events
  DROP CONSTRAINT IF EXISTS subscription_admin_events_action_check;

ALTER TABLE public.subscription_admin_events
  ADD CONSTRAINT subscription_admin_events_action_check CHECK (
    action IN (
      'renew',
      'extend',
      'manual_assign',
      'set_custom_expiry',
      'disable_access',
      'restore_access'
    )
  );

COMMIT;
