/**
 * admin-subscriptions - Supabase Edge Function
 *
 * Admin-only service-role mutation path for subscription access controls.
 *
 * This function intentionally supports only disable/restore for now. Renew and
 * extend will be added after the backend hardening is deployed and verified.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_ACTIONS = new Set(['disable_access', 'restore_access'])

type AdminSubscriptionAction = 'disable_access' | 'restore_access'

interface Body {
  action?: unknown
  userId?: unknown
  reason?: unknown
}

interface SubscriptionRow {
  id: string
  user_id: string
  is_active: boolean
  expires_at: string | null
  tier: string | null
  duration_months: number | null
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

  if (typedAction === 'restore_access' && previous.expires_at) {
    const expiresAt = new Date(previous.expires_at)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return json({
        error: 'Subscription is expired. Renewal is required before access can be restored.',
        code:  'SUBSCRIPTION_EXPIRED_RENEW_REQUIRED',
      }, 409)
    }
  }

  const nextIsActive = typedAction === 'restore_access'
  const { data: updated, error: updateError } = await adminClient
    .from('subscriptions')
    .update({ is_active: nextIsActive })
    .eq('id', previous.id)
    .select('id, user_id, is_active, expires_at, tier, duration_months')
    .single()

  if (updateError || !updated) {
    console.error('[admin-subscriptions] Subscription update error:', updateError?.message)
    return json({ error: 'Failed to update subscription', code: 'SUBSCRIPTION_UPDATE_FAILED' }, 500)
  }

  const next = updated as SubscriptionRow

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
        source:                   'admin-subscriptions',
        previous_duration_months: previous.duration_months,
        new_duration_months:      next.duration_months,
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
