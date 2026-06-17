/**
 * admin-devices - Supabase Edge Function
 *
 * Admin-only service-role mutation path for device-slot resets.
 * Rows are kept for audit/history; resets only mark active rows inactive.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_ACTIONS = new Set(['reset_user_devices'])
const VALID_DEVICE_KINDS = new Set(['desktop', 'mobile', 'all'])

type DeviceKindReset = 'desktop' | 'mobile' | 'all'

interface Body {
  action?: unknown
  userId?: unknown
  deviceKind?: unknown
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
    console.error('[admin-devices] Missing Supabase service configuration')
    return json({ error: 'Server configuration error', code: 'SERVER_CONFIG_ERROR' }, 500)
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const token       = authHeader.replace('Bearer ', '')

  const { data: { user: adminUser }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !adminUser) {
    console.warn('[admin-devices] Auth error:', authError?.message)
    return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }

  if (adminUser.app_metadata?.role !== 'admin') {
    console.warn('[admin-devices] Non-admin attempted device reset:', adminUser.id)
    return json({ error: 'Admin role required', code: 'ADMIN_REQUIRED' }, 403)
  }

  let body: Body
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, 400) }

  const action = typeof body.action === 'string' ? body.action : ''
  if (!VALID_ACTIONS.has(action)) {
    return json({ error: 'Unsupported device action', code: 'INVALID_ACTION' }, 400)
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!UUID_RE.test(userId)) {
    return json({ error: 'Valid userId is required', code: 'INVALID_USER_ID' }, 400)
  }

  const deviceKind = parseDeviceKind(body.deviceKind)
  if (!deviceKind) {
    return json({ error: 'deviceKind must be desktop, mobile, or all', code: 'INVALID_DEVICE_KIND' }, 400)
  }

  let query = adminClient
    .from('user_devices')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (deviceKind !== 'all') {
    query = query.eq('device_kind', deviceKind)
  }

  const { data: resetRows, error: resetError } = await query
    .select('id, device_kind')

  if (resetError) {
    console.error('[admin-devices] Device reset error:', resetError.message)
    return json({ error: 'Failed to reset devices', code: 'DEVICE_RESET_FAILED' }, 500)
  }

  return json({
    status: 'ok',
    deviceKind,
    resetCount: resetRows?.length ?? 0,
  })
})

function parseDeviceKind(value: unknown): DeviceKindReset | null {
  const deviceKind = typeof value === 'string' ? value : 'all'
  return VALID_DEVICE_KINDS.has(deviceKind) ? (deviceKind as DeviceKindReset) : null
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
