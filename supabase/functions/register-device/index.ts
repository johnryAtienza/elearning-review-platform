/**
 * register-device — Supabase Edge Function
 *
 * Registers (or re-touches) the calling user's device against the
 * user_devices table. Enforces the Phase G hard cap:
 *   - 1 active mobile device per user
 *   - 1 active desktop device per user
 *
 * Called on every login / register / app boot (after auth.initialize).
 *
 * Flow:
 *   1. Verify JWT.
 *   2. Look up an existing row matching (user_id, device_kind, fingerprint).
 *      FingerprintJS visitorIds are accepted only as migration aliases.
 *      If found → migrate alias to stable ID, update last_seen_at, return ok.
 *   3. Count active rows of the same device_kind. If >= 1 → return
 *      { status: 'limit_reached', devices: [...activeList] }.
 *      The client shows DeviceLimitModal; user revokes one then retries.
 *   4. Otherwise INSERT a new row. The partial UNIQUE index
 *      (user_id, device_kind) WHERE is_active will reject any concurrent
 *      second insert with code 23505 — we treat that as limit_reached
 *      too (fetch + return the current list).
 *
 * POST /functions/v1/register-device
 * Authorization: Bearer <supabase-jwt>
 * Body: {
 *   fingerprint: string                // Stable browser-install ID
 *   fingerprintAliases?: string[]      // Legacy FingerprintJS visitorIds
 *   deviceKind:  'mobile' | 'desktop'  // classified client-side from UA
 *   userAgent?:  string
 * }
 *
 * Responses:
 *   200 { status: 'ok',            device:  UserDevice }
 *   200 { status: 'limit_reached', devices: UserDevice[] }
 *   400 invalid body
 *   401 unauthorized
 *   500 server / DB error
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type DeviceKind = 'mobile' | 'desktop'

interface RegisterBody {
  fingerprint?: unknown
  fingerprintAliases?: unknown
  deviceKind?: unknown
  userAgent?: unknown
}

interface DeviceRow {
  id: string
  user_id: string
  fingerprint: string
  device_kind: DeviceKind
  user_agent: string
  ip: string | null
  label: string | null
  is_active: boolean
  first_seen_at: string
  last_seen_at: string
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
  let body: RegisterBody
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body' }, 400) }

  const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint.trim() : ''
  const fingerprintAliases = Array.isArray(body.fingerprintAliases)
    ? body.fingerprintAliases
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value && value !== fingerprint)
      .slice(0, 5)
    : []
  const deviceKind  = body.deviceKind === 'mobile' || body.deviceKind === 'desktop'
    ? (body.deviceKind as DeviceKind)
    : ''
  const userAgent   = typeof body.userAgent === 'string' ? body.userAgent.slice(0, 512) : ''

  if (!fingerprint) return json({ error: 'fingerprint is required' }, 400)
  if (!deviceKind)  return json({ error: "deviceKind must be 'mobile' or 'desktop'" }, 400)

  // Best-effort: capture caller IP for the audit trail (may be missing).
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           ?? req.headers.get('cf-connecting-ip')
           ?? null

  const fingerprints = Array.from(new Set([fingerprint, ...fingerprintAliases]))

  // ── 1. Already-known device? Touch last_seen_at and return ok. ─────────────
  const { data: existingRows, error: lookupErr } = await adminClient
    .from('user_devices')
    .select('*')
    .eq('user_id', user.id)
    .eq('device_kind', deviceKind)
    .in('fingerprint', fingerprints)

  if (lookupErr) {
    console.error('[register-device] Lookup error:', lookupErr)
    return json({ error: 'Failed to look up device' }, 500)
  }

  const existing = chooseExistingDevice((existingRows ?? []) as DeviceRow[], fingerprint)

  if (existing) {
    // Re-activate if previously revoked AND we still have room; if no room,
    // return limit_reached so the user gets the modal.
    if (!existing.is_active) {
      const room = await hasRoomFor(adminClient, user.id, deviceKind)
      if (!room) {
        const devices = await listActiveDevices(adminClient, user.id)
        return json({ status: 'limit_reached', devices })
      }
      const { data: reactivated, error: reactErr } = await adminClient
        .from('user_devices')
        .update({
          fingerprint,
          is_active:     true,
          device_kind:   deviceKind,   // user-agent may have changed
          user_agent:    userAgent || existing.user_agent,
          ip:            ip ?? existing.ip,
          last_seen_at:  new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (reactErr) {
        // 23505 = unique_violation — concurrent registrant grabbed the slot.
        if (isUniqueViolation(reactErr)) {
          const devices = await listActiveDevices(adminClient, user.id)
          return json({ status: 'limit_reached', devices })
        }
        console.error('[register-device] Reactivate error:', reactErr)
        return json({ error: 'Failed to reactivate device' }, 500)
      }
      return json({ status: 'ok', device: toUserDevice(reactivated as DeviceRow) })
    }

    // Already active — just touch.
    const { data: touched, error: touchErr } = await adminClient
      .from('user_devices')
      .update({
        fingerprint,
        last_seen_at: new Date().toISOString(),
        user_agent:   userAgent || existing.user_agent,
        ip:           ip ?? existing.ip,
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (touchErr) {
      console.error('[register-device] Touch error:', touchErr)
      return json({ error: 'Failed to touch device' }, 500)
    }
    return json({ status: 'ok', device: toUserDevice(touched as DeviceRow) })
  }

  // ── 2. New device — enforce the cap. ───────────────────────────────────────
  const room = await hasRoomFor(adminClient, user.id, deviceKind)
  if (!room) {
    const devices = await listActiveDevices(adminClient, user.id)
    return json({ status: 'limit_reached', devices })
  }

  // ── 3. INSERT — partial unique index protects against concurrent inserts. ─
  const { data: inserted, error: insertErr } = await adminClient
    .from('user_devices')
    .insert({
      user_id:     user.id,
      fingerprint,
      device_kind: deviceKind,
      user_agent:  userAgent,
      ip,
      is_active:   true,
    })
    .select('*')
    .single()

  if (insertErr) {
    if (isUniqueViolation(insertErr)) {
      // Concurrent registrant won. Return current state.
      const devices = await listActiveDevices(adminClient, user.id)
      return json({ status: 'limit_reached', devices })
    }
    console.error('[register-device] Insert error:', insertErr)
    return json({ error: 'Failed to register device' }, 500)
  }

  return json({ status: 'ok', device: toUserDevice(inserted as DeviceRow) })
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function chooseExistingDevice(rows: DeviceRow[], primaryFingerprint: string): DeviceRow | null {
  return rows.find((row) => row.fingerprint === primaryFingerprint)
    ?? rows.find((row) => row.is_active)
    ?? rows[0]
    ?? null
}

async function hasRoomFor(
  client: ReturnType<typeof createClient>,
  userId: string,
  deviceKind: DeviceKind,
): Promise<boolean> {
  const { count, error } = await client
    .from('user_devices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('device_kind', deviceKind)
    .eq('is_active', true)
  if (error) {
    console.error('[register-device] Count error:', error)
    return false   // Fail closed — better to false-reject than over-allow.
  }
  return (count ?? 0) < 1
}

async function listActiveDevices(
  client: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data } = await client
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_seen_at', { ascending: false })
  return ((data ?? []) as DeviceRow[]).map(toUserDevice)
}

function toUserDevice(row: DeviceRow) {
  return {
    id: row.id,
    userId: row.user_id,
    fingerprint: row.fingerprint,
    deviceKind: row.device_kind,
    userAgent: row.user_agent,
    ip: row.ip,
    label: row.label,
    isActive: row.is_active,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  }
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code
  return code === '23505'
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
