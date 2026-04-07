/**
 * subscribe — Supabase Edge Function
 *
 * Creates or extends a user's Standard subscription.
 *
 * Duration options  : 1 | 3 | 6 months
 *
 * Carryover logic (enforced in the DB function extend_subscription):
 *   • New subscriber        → expires_at = NOW() + N months
 *   • Extending before expiry → expires_at = current_expires_at + N months
 *   • Extending after expiry  → expires_at = NOW() + N months (fresh start)
 *
 * This endpoint is intentionally payment-agnostic. In production wire in
 * your PayMongo webhook to call this function only after a successful charge.
 * For testing / admin use it can be called directly with a valid JWT.
 *
 * POST /functions/v1/subscribe
 * Authorization: Bearer <supabase-jwt>
 * Body: { durationMonths: 1 | 3 | 6 }
 *
 * Success 200: { expiresAt, previousExpiresAt, daysAdded, tier }
 * Error   400: invalid body / bad duration
 * Error   401: missing / invalid JWT
 * Error   500: database error
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_DURATIONS = new Set([1, 3, 6])

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST')   return json({ error: 'Method not allowed' }, 405)

  // ── Verify JWT ──────────────────────────────────────────────────────────────
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
    console.error('[subscribe] Auth error:', authError?.message)
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { durationMonths?: unknown }
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body' }, 400) }

  const durationMonths = Number(body.durationMonths)
  if (!VALID_DURATIONS.has(durationMonths)) {
    return json({ error: 'durationMonths must be 1, 3, or 6' }, 400)
  }

  // ── Extend subscription via DB function ────────────────────────────────────
  // extend_subscription handles the carryover logic in a single atomic operation.
  const { data, error: dbError } = await adminClient
    .rpc('extend_subscription', {
      p_user_id:         user.id,
      p_duration_months: durationMonths,
      p_tier:            'standard',
    })
    .single()

  if (dbError || !data) {
    console.error('[subscribe] DB error:', dbError?.message)
    return json({ error: 'Failed to update subscription' }, 500)
  }

  const row = data as {
    new_expires_at:      string | null
    previous_expires_at: string | null
    days_added:          number
  }

  return json({
    tier:               'standard',
    expiresAt:          row.new_expires_at,
    previousExpiresAt:  row.previous_expires_at,
    daysAdded:          row.days_added,
  })
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
