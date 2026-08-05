/**
 * get-playback-session — authoritative lesson playback gate
 *
 * This is the only endpoint the student app uses to obtain video playback
 * information. Legacy lessons receive a short-lived R2 URL while they are
 * being migrated. DRM-ready lessons receive only short-lived manifest and
 * license-session information from the configured server-side broker.
 *
 * The browser never receives R2 credentials, provider credentials, signing
 * keys, or long-lived license material.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3'

const LEGACY_URL_TTL = 60
const BROKER_TIMEOUT_MS = 8_000
const MAX_PLAYBACK_TTL_SECONDS = 15 * 60

type LessonRow = {
  subject_id: string
  video_url: string | null
  reviewer_pdf_url: string | null
  is_free_preview: boolean | null
  drm_enabled: boolean | null
  drm_provider: string | null
  drm_asset_id: string | null
  drm_processing_status: string | null
  drm_dash_manifest_url: string | null
  drm_hls_manifest_url: string | null
}

type BrokerResponse = {
  manifestUrl?: unknown
  dashManifestUrl?: unknown
  hlsManifestUrl?: unknown
  licenseServers?: unknown
  licenseToken?: unknown
  fairPlayCertificateUrl?: unknown
  sessionId?: unknown
  expiresAt?: unknown
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server not configured' }, 500, headers)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  let userId: string | null = null
  let userEmail: string | null = null
  let isAdmin = false
  if (token) {
    const { data } = await adminClient.auth.getUser(token)
    if (data?.user) {
      userId = data.user.id
      userEmail = data.user.email ?? null
      isAdmin = data.user.app_metadata?.role === 'admin'
    }
  }

  let body: { lessonId?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, headers)
  }

  const lessonId = typeof body.lessonId === 'string' ? body.lessonId.trim() : ''
  if (!lessonId) return json({ error: 'lessonId is required' }, 400, headers)

  const { data: lesson, error: lessonError } = await adminClient
    .from('lessons')
    .select('subject_id, video_url, reviewer_pdf_url, is_free_preview, drm_enabled, drm_provider, drm_asset_id, drm_processing_status, drm_dash_manifest_url, drm_hls_manifest_url')
    .eq('id', lessonId)
    .maybeSingle<LessonRow>()

  if (lessonError) {
    console.error('[get-playback-session] Lesson lookup failed:', lessonError.message)
    return json({ error: 'Failed to fetch lesson' }, 500, headers)
  }
  if (!lesson) return json({ error: 'Lesson not found' }, 404, headers)

  // Do not issue playback for unpublished content, even when the caller is an
  // administrator. Admin preview should use the existing admin workflow.
  const { data: subject, error: subjectError } = await adminClient
    .from('subjects')
    .select('id')
    .eq('id', lesson.subject_id)
    .eq('is_published', true)
    .maybeSingle()
  if (subjectError) {
    console.error('[get-playback-session] Subject lookup failed:', subjectError.message)
    return json({ error: 'Failed to verify lesson publication' }, 500, headers)
  }
  if (!subject) return json({ error: 'Lesson not found' }, 404, headers)

  let tier: 'free' | 'standard' = 'free'
  if (userId) {
    const now = new Date().toISOString()
    const { data: subscription } = await adminClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle()
    if (subscription) tier = 'standard'
  }

  const isPreview = lesson.is_free_preview === true
  const canAccess = isPreview || isAdmin || tier === 'standard'
  if (!canAccess) {
    return userId
      ? json({ error: 'Subscription required' }, 403, headers)
      : json({ error: 'Unauthorized' }, 401, headers)
  }

  const drmReady = lesson.drm_enabled === true && lesson.drm_processing_status === 'ready'
  if (lesson.drm_enabled === true && !drmReady) {
    return json({ error: 'Protected video is still processing' }, 409, headers)
  }

  // DRM license authorization requires an authenticated caller by design.
  // Legacy public previews remain available during migration; migrated DRM
  // previews require the visitor to sign in before a license session is issued.
  if (drmReady && !userId) {
    return json({ error: 'Sign in is required to play protected video' }, 401, headers)
  }

  const effectiveTier: 'free' | 'standard' = isPreview ? 'standard' : tier

  if (drmReady) {
    if (!lesson.drm_provider || !lesson.drm_asset_id) {
      console.error('[get-playback-session] DRM asset metadata is incomplete')
      return json({ error: 'Protected video is not configured' }, 503, headers)
    }

    const brokerUrl = Deno.env.get('DRM_SESSION_BROKER_URL')
    const brokerToken = Deno.env.get('DRM_SESSION_BROKER_TOKEN')
    if (!brokerUrl || !brokerToken) {
      console.error('[get-playback-session] DRM session broker is not configured')
      return json({ error: 'Protected playback is not configured' }, 503, headers)
    }

    const brokerResponse = await issueBrokerSession({
      brokerUrl,
      brokerToken,
      userId: userId!,
      lessonId,
      provider: lesson.drm_provider,
      assetId: lesson.drm_asset_id,
    })
    if (!brokerResponse.ok) return json({ error: brokerResponse.error }, brokerResponse.status, headers)

    const playback = validateBrokerResponse(brokerResponse.data)
    if (!playback) return json({ error: 'Protected playback response is invalid' }, 502, headers)
    const pdfResult = await signPdfSafely(lesson.reviewer_pdf_url)
    if (!pdfResult.ok) {
      console.error('[get-playback-session] R2 signing failed')
      return json({ error: 'Storage is not configured' }, 500, headers)
    }

    return json({
      playbackMode: 'drm',
      videoUrl: null,
      pdfUrl: pdfResult.value,
      playback: {
        ...playback,
        watermarkLabel: maskedEmail(userEmail),
      },
      tier: effectiveTier,
    }, 200, headers)
  }

  let videoUrl: string | null
  try {
    videoUrl = await signVideoIfPresent(lesson.video_url)
  } catch {
    console.error('[get-playback-session] Legacy video signing failed')
    return json({ error: 'Storage is not configured' }, 500, headers)
  }
  const pdfResult = await signPdfSafely(lesson.reviewer_pdf_url)
  if (!pdfResult.ok) {
    console.error('[get-playback-session] R2 signing failed')
    return json({ error: 'Storage is not configured' }, 500, headers)
  }
  return json({
    playbackMode: 'legacy',
    videoUrl,
    pdfUrl: pdfResult.value,
    playback: null,
    tier: effectiveTier,
  }, 200, headers)
})

async function issueBrokerSession(input: {
  brokerUrl: string
  brokerToken: string
  userId: string
  lessonId: string
  provider: string
  assetId: string
}): Promise<{ ok: true; data: BrokerResponse } | { ok: false; status: number; error: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BROKER_TIMEOUT_MS)
  try {
    const response = await fetch(input.brokerUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.brokerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: input.userId,
        lessonId: input.lessonId,
        provider: input.provider,
        assetId: input.assetId,
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      // Do not forward provider response bodies or tokens to the browser/logs.
      return { ok: false, status: response.status === 401 || response.status === 403 ? 403 : 502, error: 'License authorization failed' }
    }
    const data = await response.json() as BrokerResponse
    return { ok: true, data }
  } catch (error) {
    console.error('[get-playback-session] DRM broker request failed:', error instanceof Error ? error.name : 'unknown')
    return { ok: false, status: 502, error: 'License authorization unavailable' }
  } finally {
    clearTimeout(timeout)
  }
}

async function signPdfSafely(path: string | null): Promise<{ ok: true; value: string | null } | { ok: false }> {
  try {
    return { ok: true, value: await signPdfIfPresent(path) }
  } catch {
    return { ok: false }
  }
}

function validateBrokerResponse(data: BrokerResponse) {
  const manifestUrl = asHttpsUrl(data.manifestUrl)
  // Persisted manifest references are operational metadata only. Playback must
  // use broker-issued short-lived URLs so a database value can never become a
  // long-lived downloadable origin for students.
  const dashManifestUrl = asHttpsUrl(data.dashManifestUrl)
  const hlsManifestUrl = asHttpsUrl(data.hlsManifestUrl)
  const servers = data.licenseServers && typeof data.licenseServers === 'object'
    ? data.licenseServers as Record<string, unknown>
    : {}
  const licenseServers = {
    widevine: asHttpsUrl(servers.widevine),
    fairplay: asHttpsUrl(servers.fairplay),
    playready: asHttpsUrl(servers.playready),
  }
  const licenseToken = typeof data.licenseToken === 'string' && data.licenseToken.length > 0 ? data.licenseToken : null
  const expiresAt = typeof data.expiresAt === 'string' ? data.expiresAt : null
  const expiryMs = expiresAt ? Date.parse(expiresAt) : NaN
  const maxExpiry = Date.now() + MAX_PLAYBACK_TTL_SECONDS * 1000
  const hasManifest = Boolean(manifestUrl || dashManifestUrl || hlsManifestUrl)
  const hasLicenseServer = Object.values(licenseServers).some(Boolean)

  if (!hasManifest || !hasLicenseServer || !licenseToken || !Number.isFinite(expiryMs) || expiryMs <= Date.now() || expiryMs > maxExpiry) return null

  return {
    mode: 'drm' as const,
    manifestUrl,
    dashManifestUrl,
    hlsManifestUrl,
    licenseServers: Object.fromEntries(Object.entries(licenseServers).filter((entry): entry is [string, string] => Boolean(entry[1]))),
    licenseToken,
    fairPlayCertificateUrl: asHttpsUrl(data.fairPlayCertificateUrl),
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : null,
    expiresAt,
  }
}

function asHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

async function signVideoIfPresent(path: string | null): Promise<string | null> {
  if (!path) return null
  const s3 = getR2Client()
  if (!s3) throw new Error('R2 is not configured')
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: getRequiredEnv('R2_BUCKET_NAME'), Key: path }), { expiresIn: LEGACY_URL_TTL })
}

async function signPdfIfPresent(path: string | null): Promise<string | null> {
  if (!path) return null
  const s3 = getR2Client()
  if (!s3) throw new Error('R2 is not configured')
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: getRequiredEnv('R2_BUCKET_NAME'),
    Key: path,
    ResponseContentDisposition: 'inline',
    ResponseContentType: 'application/pdf',
  }), { expiresIn: LEGACY_URL_TTL })
}

function getR2Client(): S3Client | null {
  const accountId = Deno.env.get('R2_ACCOUNT_ID')
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
  const bucketName = Deno.env.get('R2_BUCKET_NAME')
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function maskedEmail(email: string | null): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!local || !domain) return null
  return `${local.slice(0, 1)}***@${domain}`
}

function corsHeaders(req: Request): Record<string, string> {
  const configured = (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '')
    .split(',').map((value) => value.trim()).filter(Boolean)
  const requestOrigin = req.headers.get('Origin')
  const allowOrigin = requestOrigin && configured.includes(requestOrigin)
    ? requestOrigin
    : configured[0] ?? '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
