/**
 * admin-users - Supabase Edge Function
 *
 * Admin-only service-role mutation path for user account creation.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_ACTIONS = new Set(['create_user'])
const VALID_ROLES = new Set(['user', 'admin'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Body {
  action?: unknown
  email?: unknown
  password?: unknown
  firstName?: unknown
  lastName?: unknown
  mobileNumber?: unknown
  school?: unknown
  schoolId?: unknown
  role?: unknown
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
    console.error('[admin-users] Missing Supabase service configuration')
    return json({ error: 'Server configuration error', code: 'SERVER_CONFIG_ERROR' }, 500)
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const token       = authHeader.replace('Bearer ', '')

  const { data: { user: adminUser }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !adminUser) {
    console.warn('[admin-users] Auth error:', authError?.message)
    return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }

  if (adminUser.app_metadata?.role !== 'admin') {
    console.warn('[admin-users] Non-admin attempted user creation:', adminUser.id)
    return json({ error: 'Admin role required', code: 'ADMIN_REQUIRED' }, 403)
  }

  let body: Body
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, 400) }

  const action = typeof body.action === 'string' ? body.action : ''
  if (!VALID_ACTIONS.has(action)) {
    return json({ error: 'Unsupported user action', code: 'INVALID_ACTION' }, 400)
  }

  const email = normalizeRequiredString(body.email)
  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'Valid email is required', code: 'INVALID_EMAIL' }, 400)
  }

  const password = normalizeRequiredString(body.password)
  if (!password || password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.', code: 'INVALID_PASSWORD' }, 400)
  }

  const firstName = normalizeRequiredString(body.firstName)
  const lastName  = normalizeRequiredString(body.lastName)
  if (!firstName) return json({ error: 'First name is required', code: 'FIRST_NAME_REQUIRED' }, 400)
  if (!lastName)  return json({ error: 'Last name is required', code: 'LAST_NAME_REQUIRED' }, 400)

  const role = typeof body.role === 'string' && VALID_ROLES.has(body.role)
    ? body.role
    : 'user'
  const mobileNumber = normalizeOptionalString(body.mobileNumber)
  const school       = normalizeOptionalString(body.school)
  const schoolId     = normalizeOptionalString(body.schoolId)
  const name         = `${firstName} ${lastName}`.trim()

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: {
      name,
      first_name: firstName,
      last_name: lastName,
      mobile_number: mobileNumber,
      school,
      school_id: schoolId,
    },
  })

  if (createError || !created.user) {
    console.error('[admin-users] Create user error:', createError?.message)
    return json({
      error: createError?.message ?? 'Failed to create user',
      code: 'USER_CREATE_FAILED',
    }, createError?.status ?? 500)
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .update({
      name,
      email,
      first_name: firstName,
      last_name: lastName,
      mobile_number: mobileNumber,
      school,
      school_id: schoolId,
      role,
    })
    .eq('id', created.user.id)
    .select('id, name, email, first_name, last_name, mobile_number, school, school_id, role, created_at')
    .single()

  if (profileError || !profile) {
    console.error('[admin-users] Profile update error:', profileError?.message)
    return json({ error: 'User was created but profile sync failed', code: 'PROFILE_SYNC_FAILED' }, 500)
  }

  return json({
    user: {
      id:                    profile.id,
      name:                  profile.name,
      firstName:             profile.first_name ?? '',
      lastName:              profile.last_name ?? '',
      email:                 profile.email ?? null,
      mobileNumber:          profile.mobile_number ?? '',
      school:                profile.school ?? '',
      schoolId:              profile.school_id ?? '',
      role:                  profile.role,
      isSubscribed:          false,
      subscriptionExpiresAt: null,
      createdAt:             profile.created_at,
    },
  })
})

function normalizeRequiredString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
