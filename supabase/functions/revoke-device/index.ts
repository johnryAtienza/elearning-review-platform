/**
 * revoke-device — Supabase Edge Function
 *
 * Marks a user_devices row as inactive (Phase G).
 *
 * v1 behaviour: only flips is_active=false. The other device's existing
 * Supabase session continues to work until its JWT refresh (≤1 hour),
 * at which point that device's next call to register-device on app boot
 * will be blocked by the limit check. Lag is documented in the plan;
 * acceptable trade-off for v1.
 *
 * Authorization: caller must own the device row.
 *
 * POST /functions/v1/revoke-device
 * Authorization: Bearer <supabase-jwt>
 * Body: { deviceId: string }
 *
 * Responses:
 *   200 { status: 'ok' }
 *   400 invalid body
 *   401 unauthorized
 *   403 device does not belong to caller
 *   404 device not found
 *   500 server / DB error
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST')   return json({ error: 'Method not allowed' }, 405)

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient        = createClient(supabaseUrl, supabaseServiceKey)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { deviceId?: unknown }
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body' }, 400) }

  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : ''
  if (!deviceId) return json({ error: 'deviceId is required' }, 400)

  // ── Ownership check ────────────────────────────────────────────────────────
  const { data: device, error: lookupErr } = await adminClient
    .from('user_devices')
    .select('id, user_id, is_active')
    .eq('id', deviceId)
    .maybeSingle()

  if (lookupErr) {
    console.error('[revoke-device] Lookup error:', lookupErr)
    return json({ error: 'Failed to look up device' }, 500)
  }
  if (!device) return json({ error: 'Device not found' }, 404)
  if (device.user_id !== user.id) {
    return json({ error: 'Device does not belong to this user' }, 403)
  }

  // ── Already revoked? Idempotent. ───────────────────────────────────────────
  if (!device.is_active) {
    return json({ status: 'ok', alreadyRevoked: true })
  }

  // ── Revoke ─────────────────────────────────────────────────────────────────
  const { error: updateErr } = await adminClient
    .from('user_devices')
    .update({ is_active: false })
    .eq('id', deviceId)

  if (updateErr) {
    console.error('[revoke-device] Update error:', updateErr)
    return json({ error: 'Failed to revoke device' }, 500)
  }

  return json({ status: 'ok' })
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
