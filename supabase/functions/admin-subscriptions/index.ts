/**
 * admin-subscriptions - Supabase Edge Function
 *
 * Admin-only service-role mutation path for subscription access controls,
 * renewals, extensions, and explicit expiry management.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_ACTIONS = new Set([
  'disable_access',
  'restore_access',
  'renew',
  'extend',
  'set_custom_expiry',
])
const VALID_DURATION_MONTHS = new Set([1, 3, 6])

type DurationMonths = 1 | 3 | 6
type AdminSubscriptionAction =
  | 'disable_access'
  | 'restore_access'
  | 'renew'
  | 'extend'
  | 'set_custom_expiry'

interface Body {
  action?: unknown
  userId?: unknown
  reason?: unknown
  durationMonths?: unknown
  expiresAt?: unknown
}

interface SubscriptionRow {
  id: string
  user_id: string
  is_active: boolean
  expires_at: string | null
  tier: string | null
  duration_months: number | null
}

interface ExtendSubscriptionResult {
  new_expires_at: string | null
  previous_expires_at: string | null
  days_added: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST')   return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header', code: 'UNAUTHORIZED' }, 401)
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[admin-subscriptions] Missing Supabase service configuration')
    return json({ error: 'Server configuration error', code: 'SERVER_CONFIG_ERROR' }, 500)
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const token       = authHeader.replace('Bearer ', '')

  const { data: { user: adminUser }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !adminUser) {
    console.warn('[admin-subscriptions] Auth error:', authError?.message)
    return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }

  if (adminUser.app_metadata?.role !== 'admin') {
    console.warn('[admin-subscriptions] Non-admin attempted subscription mutation:', adminUser.id)
    return json({ error: 'Admin role required', code: 'ADMIN_REQUIRED' }, 403)
  }

  let body: Body
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, 400) }

  const action = typeof body.action === 'string' ? body.action : ''
  if (!VALID_ACTIONS.has(action)) {
    return json({ error: 'Unsupported subscription action', code: 'INVALID_ACTION' }, 400)
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!UUID_RE.test(userId)) {
    return json({ error: 'Valid userId is required', code: 'INVALID_USER_ID' }, 400)
  }

  const reason = typeof body.reason === 'string' && body.reason.trim()
    ? body.reason.trim().slice(0, 1000)
    : null

  const { data: subscription, error: fetchError } = await adminClient
    .from('subscriptions')
    .select('id, user_id, is_active, expires_at, tier, duration_months')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    console.error('[admin-subscriptions] Subscription fetch error:', fetchError.message)
    return json({ error: 'Failed to fetch subscription', code: 'SUBSCRIPTION_FETCH_FAILED' }, 500)
  }

  if (!subscription) {
    return json({ error: 'Subscription not found', code: 'SUBSCRIPTION_NOT_FOUND' }, 404)
  }

  const previous = subscription as SubscriptionRow
  const typedAction = action as AdminSubscriptionAction
  const now = Date.now()
  let next: SubscriptionRow
  let metadata: Record<string, unknown> = {
    source:                   'admin-subscriptions',
    previous_duration_months: previous.duration_months,
  }

  if (typedAction === 'disable_access' || typedAction === 'restore_access') {
    if (typedAction === 'restore_access' && isExpired(previous, now)) {
      return json({
        error: 'Subscription is expired. Renewal is required before access can be restored.',
        code:  'SUBSCRIPTION_EXPIRED_RENEW_REQUIRED',
      }, 409)
    }

    const { data: updated, error: updateError } = await adminClient
      .from('subscriptions')
      .update({ is_active: typedAction === 'restore_access' })
      .eq('id', previous.id)
      .select('id, user_id, is_active, expires_at, tier, duration_months')
      .single()

    if (updateError || !updated) {
      console.error('[admin-subscriptions] Subscription update error:', updateError?.message)
      return json({ error: 'Failed to update subscription', code: 'SUBSCRIPTION_UPDATE_FAILED' }, 500)
    }

    next = updated as SubscriptionRow
  } else if (typedAction === 'renew') {
    if (!isExpired(previous, now)) {
      return json({
        error: 'Only expired subscriptions can be renewed.',
        code:  'SUBSCRIPTION_NOT_EXPIRED_USE_EXTEND',
      }, 409)
    }

    const durationMonths = parseDurationMonths(body.durationMonths)
    if (!durationMonths) {
      return json({
        error: 'durationMonths must be one of 1, 3, or 6.',
        code:  'INVALID_DURATION_MONTHS',
      }, 400)
    }

    const rpcResult = await extendSubscription(adminClient, userId, durationMonths)
    if (!rpcResult.ok) return rpcResult.response

    next = rpcResult.subscription
    metadata = {
      ...metadata,
      duration_months: durationMonths,
      previous_expires_at: rpcResult.result.previous_expires_at,
      days_added: rpcResult.result.days_added,
    }
  } else if (typedAction === 'extend') {
    if (!previous.expires_at) {
      return json({
        error: 'This subscription has no expiry date. Use Set Expiry instead.',
        code:  'SUBSCRIPTION_NO_EXPIRY_SET_CUSTOM_REQUIRED',
      }, 409)
    }

    if (!previous.is_active) {
      return json({
        error: 'Inactive subscriptions must be restored before they can be extended.',
        code:  'SUBSCRIPTION_INACTIVE_RESTORE_REQUIRED',
      }, 409)
    }

    if (isExpired(previous, now)) {
      return json({
        error: 'Subscription is expired. Renewal is required before it can be extended.',
        code:  'SUBSCRIPTION_EXPIRED_RENEW_REQUIRED',
      }, 409)
    }

    const durationMonths = parseDurationMonths(body.durationMonths)
    if (!durationMonths) {
      return json({
        error: 'durationMonths must be one of 1, 3, or 6.',
        code:  'INVALID_DURATION_MONTHS',
      }, 400)
    }

    const rpcResult = await extendSubscription(adminClient, userId, durationMonths)
    if (!rpcResult.ok) return rpcResult.response

    next = rpcResult.subscription
    metadata = {
      ...metadata,
      duration_months: durationMonths,
      previous_expires_at: rpcResult.result.previous_expires_at,
      days_added: rpcResult.result.days_added,
    }
  } else {
    const nextExpiresAt = parseFutureExpiry(body.expiresAt)
    if (!nextExpiresAt) {
      return json({
        error: 'expiresAt must be a valid future ISO timestamp.',
        code:  'INVALID_EXPIRES_AT',
      }, 400)
    }

    const { data: updated, error: updateError } = await adminClient
      .from('subscriptions')
      .update({
        is_active:  true,
        tier:       previous.tier ?? 'standard',
        expires_at: nextExpiresAt,
      })
      .eq('id', previous.id)
      .select('id, user_id, is_active, expires_at, tier, duration_months')
      .single()

    if (updateError || !updated) {
      console.error('[admin-subscriptions] Subscription custom expiry update error:', updateError?.message)
      return json({ error: 'Failed to update custom expiry', code: 'SUBSCRIPTION_UPDATE_FAILED' }, 500)
    }

    next = updated as SubscriptionRow
    metadata = {
      ...metadata,
      requested_expires_at: nextExpiresAt,
    }
  }

  const { error: auditError } = await adminClient
    .from('subscription_admin_events')
    .insert({
      subscription_id:      previous.id,
      user_id:              previous.user_id,
      admin_user_id:        adminUser.id,
      action:               typedAction,
      previous_is_active:   previous.is_active,
      previous_expires_at:  previous.expires_at,
      previous_tier:        previous.tier,
      new_is_active:        next.is_active,
      new_expires_at:       next.expires_at,
      new_tier:             next.tier,
      reason,
      metadata: {
        ...metadata,
        new_duration_months: next.duration_months,
      },
    })

  if (auditError) {
    console.error('[admin-subscriptions] Audit insert error:', auditError.message)
    return json({ error: 'Subscription updated but audit logging failed', code: 'AUDIT_LOG_FAILED' }, 500)
  }

  return json({
    subscription: {
      id:             next.id,
      userId:         next.user_id,
      isActive:       next.is_active,
      expiresAt:      next.expires_at,
      tier:           next.tier,
      durationMonths: next.duration_months,
    },
  })
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isExpired(subscription: SubscriptionRow, now = Date.now()): boolean {
  if (!subscription.expires_at) return false

  const expiresAt = new Date(subscription.expires_at)
  if (Number.isNaN(expiresAt.getTime())) return true
  return expiresAt.getTime() <= now
}

function parseDurationMonths(value: unknown): DurationMonths | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || !VALID_DURATION_MONTHS.has(value)) {
    return null
  }

  return value as DurationMonths
}

function parseFutureExpiry(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    return null
  }

  return parsed.toISOString()
}

async function extendSubscription(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  durationMonths: DurationMonths,
): Promise<
  | {
      ok: true
      result: ExtendSubscriptionResult
      subscription: SubscriptionRow
    }
  | {
      ok: false
      response: Response
    }
> {
  const { data, error } = await adminClient
    .rpc('extend_subscription', {
      p_user_id:         userId,
      p_duration_months: durationMonths,
      p_tier:            'standard',
    })
    .single()

  if (error || !data) {
    console.error('[admin-subscriptions] extend_subscription RPC error:', error?.message)
    return {
      ok: false,
      response: json({
        error: 'Failed to extend subscription.',
        code:  'SUBSCRIPTION_EXTEND_FAILED',
      }, 500),
    }
  }

  const { data: subscription, error: fetchError } = await adminClient
    .from('subscriptions')
    .select('id, user_id, is_active, expires_at, tier, duration_months')
    .eq('user_id', userId)
    .single()

  if (fetchError || !subscription) {
    console.error('[admin-subscriptions] post-RPC fetch error:', fetchError?.message)
    return {
      ok: false,
      response: json({
        error: 'Subscription extended but the updated row could not be loaded.',
        code:  'SUBSCRIPTION_FETCH_FAILED',
      }, 500),
    }
  }

  return {
    ok: true,
    result: data as ExtendSubscriptionResult,
    subscription: subscription as SubscriptionRow,
  }
}
